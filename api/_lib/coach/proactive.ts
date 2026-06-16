import type { SupabaseClient } from '@supabase/supabase-js'
import { displayName, saveCoachMessage, touchProfileTimestamps } from './alumnoCoach.js'
import { canSendProactive } from './limits.js'
import { buildDailyDigest } from './messageTemplates.js'
import { isDigestDay, isPastFirstTrainingDay, localDateKey, localParts } from './schedule.js'
import type { CoachProfile, ProactiveJobType, QuizProfile } from './types.js'
import { isPushConfigured, sendPushNotification } from '../push/client.js'
import type { PushSubscriptionPayload } from '../push/types.js'

function parseSubscription(profile: CoachProfile): PushSubscriptionPayload | null {
  const raw = profile.push_subscription
  if (!raw || typeof raw !== 'object') return null
  const sub = raw as PushSubscriptionPayload
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return null
  return sub
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
  const subscription = parseSubscription(profile)
  if (!subscription) {
    return { sent: false, reason: 'no push subscription' }
  }

  if (!isPushConfigured()) {
    return { sent: false, reason: 'push not configured' }
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
  const result = await sendPushNotification(subscription, {
    title: 'Programa Berich',
    body: text,
    url: '/programa',
  })

  if (!result.ok) {
    if (result.expired) {
      await admin
        .from('alumno_coach_profile')
        .update({ push_subscription: null, updated_at: new Date().toISOString() })
        .eq('alumno_id', profile.alumno_id)
    }
    return { sent: false, reason: result.error }
  }

  const nowIso = now.toISOString()
  await saveCoachMessage(admin, {
    alumnoId: profile.alumno_id,
    direction: 'outbound',
    messageType: 'proactive',
    body: text,
    waMessageId: null,
    status: 'sent',
  })
  await touchProfileTimestamps(admin, profile.alumno_id, { last_outbound_at: nowIso })

  return { sent: true }
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
