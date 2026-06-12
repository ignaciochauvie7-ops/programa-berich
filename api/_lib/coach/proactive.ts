import type { SupabaseClient } from '@supabase/supabase-js'
import { displayName, isWhatsAppActivationMessage, saveCoachMessage, touchProfileTimestamps } from './alumnoCoach.js'
import { canSendProactive } from './limits.js'
import { buildDailyDigest } from './messageTemplates.js'
import { isDigestDay, isPastFirstTrainingDay, localDateKey, localParts } from './schedule.js'
import type { CoachProfile, ProactiveJobType, QuizProfile } from './types.js'
import { isWhatsAppConfigured, sendWhatsAppTemplate, sendWhatsAppText } from '../whatsapp/client.js'

const MS_24H = 24 * 60 * 60 * 1000

function withinMessagingWindow(profile: CoachProfile): boolean {
  const ref = profile.last_user_reply_at ?? profile.last_inbound_at
  if (!ref) return false
  return Date.now() - new Date(ref).getTime() < MS_24H
}

function templateForDigest(): string | null {
  return process.env.WHATSAPP_TEMPLATE_DAILY_DIGEST?.trim() || null
}

export async function sendProactiveMessage(
  admin: SupabaseClient,
  profile: CoachProfile,
  nombre: string | null,
  email: string,
  job: ProactiveJobType,
  quiz: QuizProfile | null,
  now = new Date(),
): Promise<{ sent: boolean; reason?: string }> {
  if (!profile.phone_e164) {
    return { sent: false, reason: 'no phone' }
  }

  const tz = profile.timezone || 'America/Montevideo'
  const limit = await canSendProactive(admin, profile.alumno_id, tz)
  if (!limit.ok) {
    return { sent: false, reason: limit.reason }
  }

  const isTrainingDay = profile.training_days.includes(localParts(now, tz).day)
  const text = buildDailyDigest({
    profile,
    quiz,
    nombre: displayName(nombre, email),
    isTrainingDay,
    now,
  })

  if (!text) {
    return { sent: false, reason: 'empty message' }
  }

  const name = displayName(nombre, email)
  let result: { ok: boolean; messageId?: string | null; error?: string }

  if (withinMessagingWindow(profile)) {
    result = await sendWhatsAppText(profile.phone_e164, text)
  } else {
    const template = templateForDigest()
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

  const nowIso = now.toISOString()
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

/** Guarda mensajes entrantes (sin responder por WhatsApp). */
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
}

/** Recordatorio diario: corre 1 vez al día vía cron de Vercel. */
export function jobsDueNow(profile: CoachProfile, now = new Date()): { job: ProactiveJobType; scheduledFor: string }[] {
  const tz = profile.timezone || 'America/Montevideo'
  const local = localParts(now, tz)

  if (local.day === 0) return []
  if (!isPastFirstTrainingDay(profile, now, tz)) return []
  if (!isDigestDay(profile.alumno_id, now, tz)) return []

  return [{ job: 'daily_digest', scheduledFor: localDateKey(now, tz) }]
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
