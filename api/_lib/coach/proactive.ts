import type { SupabaseClient } from '@supabase/supabase-js'
import { displayName, isWhatsAppActivationMessage, saveCoachMessage, touchProfileTimestamps } from './alumnoCoach.js'
import { buildProactiveText } from './messageTemplates.js'
import { getQuizProfile } from './quizProfile.js'
import { buildSystemPrompt } from './systemPrompt.js'
import type { CoachProfile, ProactiveJobType, QuizProfile } from './types.js'
import { generateCoachReply } from '../openai/client.js'
import { isWhatsAppConfigured, sendWhatsAppTemplate, sendWhatsAppText } from '../whatsapp/client.js'

const MS_24H = 24 * 60 * 60 * 1000
const SEND_START_HOUR = 8
const SEND_END_HOUR = 20
const REPLY_DELAY_MIN_MS = 12 * 60 * 1000
const REPLY_DELAY_MAX_MS = 18 * 60 * 1000

function hashSeed(...parts: string[]): number {
  let hash = 0
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      hash = (hash * 31 + part.charCodeAt(i)) >>> 0
    }
  }
  return hash
}

function localDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function withinMessagingWindow(profile: CoachProfile): boolean {
  const ref = profile.last_user_reply_at ?? profile.last_inbound_at
  if (!ref) return false
  return Date.now() - new Date(ref).getTime() < MS_24H
}

function templateForJob(job: ProactiveJobType): string | null {
  const key = `WHATSAPP_TEMPLATE_${job.toUpperCase()}`
  return process.env[key]?.trim() || null
}

export async function sendProactiveMessage(
  admin: SupabaseClient,
  profile: CoachProfile,
  nombre: string | null,
  email: string,
  job: ProactiveJobType,
  quiz: QuizProfile | null,
): Promise<{ sent: boolean; reason?: string }> {
  if (!profile.phone_e164) {
    return { sent: false, reason: 'no phone' }
  }

  const tz = profile.timezone || 'America/Montevideo'
  const now = new Date()
  const local = localParts(now, tz)
  const isTrainingDay = profile.training_days.includes(local.day)
  const dayIndex = hashSeed(profile.alumno_id, localDateKey(now, tz))

  const text = buildProactiveText(job, {
    profile,
    quiz,
    nombre: displayName(nombre, email),
    isTrainingDay,
    dayIndex,
  })
  const name = displayName(nombre, email)

  let result: { ok: boolean; messageId?: string | null; error?: string }

  if (withinMessagingWindow(profile)) {
    result = await sendWhatsAppText(profile.phone_e164, text)
  } else {
    const template = templateForJob(job)
    if (template) {
      result = await sendWhatsAppTemplate(profile.phone_e164, template, 'es', [name])
    } else if (!isWhatsAppConfigured()) {
      return { sent: false, reason: 'whatsapp not configured' }
    } else {
      return { sent: false, reason: 'outside 24h window, no template' }
    }
  }

  if (result.ok === false) {
    return { sent: false, reason: result.error ?? 'send failed' }
  }

  const nowIso = new Date().toISOString()
  await saveCoachMessage(admin, {
    alumnoId: profile.alumno_id,
    direction: 'outbound',
    messageType: 'proactive',
    body: text,
    waMessageId: result.messageId ?? null,
    status: 'sent',
  })
  await touchProfileTimestamps(admin, profile.alumno_id, { last_outbound_at: nowIso })

  return { sent: true }
}

function replyDelayMs(): number {
  const span = REPLY_DELAY_MAX_MS - REPLY_DELAY_MIN_MS
  return REPLY_DELAY_MIN_MS + Math.floor(Math.random() * span)
}

async function scheduleInboundReply(admin: SupabaseClient, alumnoId: string): Promise<void> {
  const scheduledFor = new Date(Date.now() + replyDelayMs()).toISOString()

  await admin
    .from('coach_scheduled_sends')
    .delete()
    .eq('alumno_id', alumnoId)
    .eq('job_type', 'inbound_reply')
    .is('sent_at', null)

  await admin.from('coach_scheduled_sends').insert({
    alumno_id: alumnoId,
    job_type: 'inbound_reply',
    scheduled_for: scheduledFor,
    sent_at: null,
    skipped_reason: null,
  })
}

/** Guarda el mensaje entrante y programa respuesta (~12–18 min) para que no sea instantánea. */
export async function handleInboundText(
  admin: SupabaseClient,
  profile: CoachProfile & { nombre: string | null; email: string },
  text: string,
  waMessageId: string | null,
): Promise<void> {
  if (!profile.phone_e164) return

  const now = new Date().toISOString()

  await saveCoachMessage(admin, {
    alumnoId: profile.alumno_id,
    direction: 'inbound',
    messageType: 'text',
    body: text,
    waMessageId,
    status: 'received',
  })

  await touchProfileTimestamps(admin, profile.alumno_id, {
    last_inbound_at: now,
    last_user_reply_at: now,
  })

  if (isWhatsAppActivationMessage(text)) return

  await scheduleInboundReply(admin, profile.alumno_id)
}

async function latestUnansweredInbound(
  admin: SupabaseClient,
  alumnoId: string,
): Promise<{ body: string; created_at: string } | null> {
  const { data: inbound } = await admin
    .from('coach_messages')
    .select('body, created_at')
    .eq('alumno_id', alumnoId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!inbound) return null

  const { data: replied } = await admin
    .from('coach_messages')
    .select('id')
    .eq('alumno_id', alumnoId)
    .eq('direction', 'outbound')
    .eq('message_type', 'reply')
    .gt('created_at', inbound.created_at)
    .limit(1)
    .maybeSingle()

  if (replied) return null
  return inbound as { body: string; created_at: string }
}

export async function processPendingInboundReplies(
  admin: SupabaseClient,
): Promise<{ sent: number; skipped: number }> {
  const nowIso = new Date().toISOString()
  const { data: dueRows } = await admin
    .from('coach_scheduled_sends')
    .select('id, alumno_id, scheduled_for')
    .eq('job_type', 'inbound_reply')
    .is('sent_at', null)
    .lte('scheduled_for', nowIso)

  let sent = 0
  let skipped = 0

  for (const row of dueRows ?? []) {
    const { data: profileRow } = await admin
      .from('alumno_coach_profile')
      .select('*, alumnos!inner(email, nombre, activo)')
      .eq('alumno_id', row.alumno_id)
      .maybeSingle()

    if (!profileRow) {
      await markScheduledSend(admin, row.alumno_id, 'inbound_reply', row.scheduled_for, false, 'no profile')
      skipped += 1
      continue
    }

    const alumno = profileRow.alumnos as { email: string; nombre: string | null; activo: boolean }
    const profile = profileRow as CoachProfile & { nombre: string | null; email: string }
    profile.nombre = alumno.nombre
    profile.email = alumno.email

    if (!alumno.activo || !profile.phone_e164 || !profile.coach_active) {
      await markScheduledSend(admin, row.alumno_id, 'inbound_reply', row.scheduled_for, false, 'inactive')
      skipped += 1
      continue
    }

    const pending = await latestUnansweredInbound(admin, profile.alumno_id)
    if (!pending || isWhatsAppActivationMessage(pending.body)) {
      await markScheduledSend(admin, row.alumno_id, 'inbound_reply', row.scheduled_for, false, 'no pending question')
      skipped += 1
      continue
    }

    const quiz = await getQuizProfile(admin, profile.alumno_id)
    const { data: recent } = await admin
      .from('coach_messages')
      .select('direction, body')
      .eq('alumno_id', profile.alumno_id)
      .order('created_at', { ascending: false })
      .limit(12)

    const history =
      (recent ?? [])
        .reverse()
        .slice(0, -1)
        .map((msg) => ({
          role: msg.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
          content: msg.body as string,
        })) ?? []

    const systemPrompt = buildSystemPrompt(profile, profile.nombre, profile.email, quiz)
    const reply = await generateCoachReply(systemPrompt, history, pending.body)
    const replyText = reply.ok
      ? reply.text
      : 'Dame un segundito y te respondo en un ratito. Si es urgente, contame un poco más de contexto.'

    const sendResult = await sendWhatsAppText(profile.phone_e164, replyText)
    await saveCoachMessage(admin, {
      alumnoId: profile.alumno_id,
      direction: 'outbound',
      messageType: 'reply',
      body: replyText,
      waMessageId: sendResult.ok ? (sendResult.messageId ?? null) : null,
      status: sendResult.ok ? 'sent' : 'failed',
    })

    if (sendResult.ok) {
      await touchProfileTimestamps(admin, profile.alumno_id, { last_outbound_at: new Date().toISOString() })
      await markScheduledSend(admin, row.alumno_id, 'inbound_reply', row.scheduled_for, true)
      sent += 1
    } else {
      await markScheduledSend(admin, row.alumno_id, 'inbound_reply', row.scheduled_for, false, sendResult.error)
      skipped += 1
    }
  }

  return { sent, skipped }
}

function localParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase() ?? ''
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  const dayMap: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  }
  return { day: dayMap[weekday.slice(0, 3)] ?? date.getUTCDay(), hour, minute }
}

/** Horario estable por alumno, job y día (ventana 15 min). */
function dailySendSlot(alumnoId: string, job: ProactiveJobType, date: Date, timeZone: string): { hour: number; minute: number } {
  const dateKey = localDateKey(date, timeZone)
  const seed = hashSeed(alumnoId, job, dateKey)
  const jobBias: Partial<Record<ProactiveJobType, number>> = {
    nutrition_am: 2,
    hydration: 6,
    steps_reminder: 8,
    nutrition_pm: 10,
    training_reminder: 0,
    impediment_support: 12,
    weekend_boost: 3,
    weekly_check: 4,
    reengagement: 14,
  }
  const bias = jobBias[job] ?? 5
  const slotsPerHour = 4
  const totalSlots = (SEND_END_HOUR - SEND_START_HOUR) * slotsPerHour
  const slot = (seed + bias) % totalSlots
  return {
    hour: SEND_START_HOUR + Math.floor(slot / slotsPerHour),
    minute: (slot % slotsPerHour) * 15,
  }
}

function isInSendWindow(localHour: number): boolean {
  return localHour >= SEND_START_HOUR && localHour < SEND_END_HOUR
}

function isDueNow(now: Date, timeZone: string, alumnoId: string, job: ProactiveJobType): boolean {
  const local = localParts(now, timeZone)
  if (!isInSendWindow(local.hour)) return false

  const slot = dailySendSlot(alumnoId, job, now, timeZone)
  return local.hour === slot.hour && local.minute >= slot.minute && local.minute < slot.minute + 15
}

function slotKey(date: Date): string {
  const d = new Date(date)
  d.setSeconds(0, 0)
  d.setMinutes(Math.floor(d.getMinutes() / 15) * 15)
  return d.toISOString()
}

export function jobsDueNow(profile: CoachProfile, now = new Date()): { job: ProactiveJobType; scheduledFor: string }[] {
  const tz = profile.timezone || 'America/Montevideo'
  const local = localParts(now, tz)
  const due: { job: ProactiveJobType; scheduledFor: string }[] = []

  if (!isInSendWindow(local.hour)) return due

  const personalized = profile.calorie_target != null

  if (personalized) {
    if (isDueNow(now, tz, profile.alumno_id, 'nutrition_am')) {
      due.push({ job: 'nutrition_am', scheduledFor: slotKey(now) })
    }
    if (isDueNow(now, tz, profile.alumno_id, 'hydration')) {
      due.push({ job: 'hydration', scheduledFor: slotKey(now) })
    }
    if (isDueNow(now, tz, profile.alumno_id, 'nutrition_pm')) {
      due.push({ job: 'nutrition_pm', scheduledFor: slotKey(now) })
    }
    const altDay = hashSeed(profile.alumno_id, localDateKey(now, tz)) % 2 === 0
    if (altDay && isDueNow(now, tz, profile.alumno_id, 'steps_reminder')) {
      due.push({ job: 'steps_reminder', scheduledFor: slotKey(now) })
    } else if (!altDay && isDueNow(now, tz, profile.alumno_id, 'impediment_support')) {
      due.push({ job: 'impediment_support', scheduledFor: slotKey(now) })
    }
    if (local.day === 6 && isDueNow(now, tz, profile.alumno_id, 'weekend_boost')) {
      due.push({ job: 'weekend_boost', scheduledFor: slotKey(now) })
    }
  } else {
    if (isDueNow(now, tz, profile.alumno_id, 'hydration')) {
      due.push({ job: 'hydration', scheduledFor: slotKey(now) })
    }
    if (isDueNow(now, tz, profile.alumno_id, 'nutrition')) {
      due.push({ job: 'nutrition', scheduledFor: slotKey(now) })
    }
  }

  if (profile.training_days.includes(local.day) && isDueNow(now, tz, profile.alumno_id, 'training_reminder')) {
    due.push({ job: 'training_reminder', scheduledFor: slotKey(now) })
  }

  const weeklyDay = profile.training_days.slice().sort((a, b) => a - b)[0]
  if (weeklyDay !== undefined && local.day === weeklyDay && isDueNow(now, tz, profile.alumno_id, 'weekly_check')) {
    due.push({ job: 'weekly_check', scheduledFor: slotKey(now) })
  }

  if (profile.last_user_reply_at) {
    const silentMs = now.getTime() - new Date(profile.last_user_reply_at).getTime()
    if (silentMs >= 2 * MS_24H && isDueNow(now, tz, profile.alumno_id, 'reengagement')) {
      due.push({ job: 'reengagement', scheduledFor: slotKey(now) })
    }
  }

  return due
}

export async function markScheduledSend(
  admin: SupabaseClient,
  alumnoId: string,
  job: ProactiveJobType,
  scheduledFor: string,
  sent: boolean,
  skippedReason?: string,
): Promise<void> {
  await admin.from('coach_scheduled_sends').upsert(
    {
      alumno_id: alumnoId,
      job_type: job,
      scheduled_for: scheduledFor,
      sent_at: sent ? new Date().toISOString() : null,
      skipped_reason: sent ? null : (skippedReason ?? null),
    },
    { onConflict: 'alumno_id,job_type,scheduled_for' },
  )
}

export async function wasAlreadyScheduled(
  admin: SupabaseClient,
  alumnoId: string,
  job: ProactiveJobType,
  scheduledFor: string,
): Promise<boolean> {
  const { data } = await admin
    .from('coach_scheduled_sends')
    .select('id, sent_at')
    .eq('alumno_id', alumnoId)
    .eq('job_type', job)
    .eq('scheduled_for', scheduledFor)
    .maybeSingle()

  return Boolean(data?.sent_at)
}
