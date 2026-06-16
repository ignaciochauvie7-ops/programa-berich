import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { getQuizProfile } from '../_lib/coach/quizProfile.js'
import {
  jobsDueNow,
  markScheduledSend,
  sendProactiveMessage,
  wasAlreadyScheduled,
} from '../_lib/coach/proactive.js'
import type { CoachProfile } from '../_lib/coach/types.js'
import { isPushConfigured, sendPushNotification } from '../_lib/push/client.js'
import type { PushSubscriptionPayload } from '../_lib/push/types.js'

const TRIAL_DAYS = 30
// Days before trial end when we notify the alumno
const TRIAL_WARNING_DAYS = 1

function authorizeCron(request: Request): boolean {
  if (request.headers.get('x-vercel-cron') === '1') return true

  const secrets = [process.env.COACH_CRON_SECRET, process.env.CRON_SECRET]
    .map((value) => value?.trim())
    .filter(Boolean) as string[]

  if (!secrets.length) return false

  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.replace(/^Bearer\s+/i, '').trim()
  if (bearer && secrets.some((secret) => bearer === secret)) return true

  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret')?.trim()
  return Boolean(querySecret && secrets.some((secret) => querySecret === secret))
}

function parseSubscription(profile: CoachProfile): PushSubscriptionPayload | null {
  const raw = profile.push_subscription
  if (!raw || typeof raw !== 'object') return null
  const sub = raw as PushSubscriptionPayload
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return null
  return sub
}

/**
 * Checks if the trial has expired for an alumno without an active subscription.
 * Returns the number of days since the trial ended (positive = expired).
 */
function trialDaysExpired(purchasedAt: string | null | undefined): number | null {
  if (!purchasedAt) return null
  const trialEnd = new Date(purchasedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  const msElapsed = Date.now() - trialEnd
  return msElapsed / (1000 * 60 * 60 * 24)
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!authorizeCron(request)) {
    return json({ error: 'unauthorized' }, 401)
  }

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const { data: profiles, error } = await admin
    .from('alumno_coach_profile')
    .select('*, alumnos!inner(email, nombre, activo)')
    .eq('coach_active', true)
    .not('push_subscription', 'is', null)

  if (error) {
    console.error('[coach cron]', error)
    return json({ error: 'query failed' }, 500)
  }

  let sent = 0
  let skipped = 0
  let trialExpired = 0
  let trialWarned = 0

  for (const row of profiles ?? []) {
    const alumno = row.alumnos as { email: string; nombre: string | null; activo: boolean }
    if (!alumno.activo) continue

    const profile = row as CoachProfile

    // --- Trial expiry check ---
    // If the alumno has no active subscription, check if the trial ended
    if (profile.coach_subscription_status !== 'active') {
      const quiz = await getQuizProfile(admin, profile.alumno_id)
      const daysExpired = trialDaysExpired(quiz?.purchased_at)

      if (daysExpired !== null) {
        const daysUntilEnd = -daysExpired // positive = days remaining

        // Send a warning push the day before the trial ends (once)
        if (daysUntilEnd <= TRIAL_WARNING_DAYS && daysUntilEnd > 0 && !profile.trial_notified_at) {
          const subscription = parseSubscription(profile)
          if (subscription && isPushConfigured()) {
            const result = await sendPushNotification(subscription, {
              title: '¡Tu mes de acompañamiento vence mañana!',
              body: 'Podés seguir recibiendo recordatorios activando el plan mensual desde Mi perfil.',
              url: '/programa/mi-perfil?upgrade=1',
            })
            if (result.ok) {
              await admin
                .from('alumno_coach_profile')
                .update({ trial_notified_at: new Date().toISOString() })
                .eq('alumno_id', profile.alumno_id)
              trialWarned += 1
              console.info('[coach cron] trial warning sent', alumno.email)
            }
          }
        }

        // Trial expired: disable coach and skip the regular message
        if (daysExpired > 0) {
          await admin
            .from('alumno_coach_profile')
            .update({
              coach_active: false,
              coach_subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('alumno_id', profile.alumno_id)

          trialExpired += 1
          console.info('[coach cron] trial expired, coach disabled', alumno.email)

          // Send a final "upgrade to keep going" push (only on expiry day)
          if (daysExpired <= 1) {
            const subscription = parseSubscription(profile)
            if (subscription && isPushConfigured()) {
              await sendPushNotification(subscription, {
                title: 'Tu mes de acompañamiento gratuito terminó',
                body: 'Si querés seguir recibiendo recordatorios, activá el plan desde Mi perfil.',
                url: '/programa/mi-perfil?upgrade=1',
              })
            }
          }

          continue // skip sending today's regular message
        }
      }
    }

    // --- Regular daily digest ---
    const quiz = await getQuizProfile(admin, profile.alumno_id)
    const dueJobs = jobsDueNow(profile)

    for (const { job, scheduledFor } of dueJobs) {
      const already = await wasAlreadyScheduled(admin, profile.alumno_id, job, scheduledFor)
      if (already) {
        skipped += 1
        continue
      }

      const result = await sendProactiveMessage(admin, profile, alumno.nombre, alumno.email, job, quiz)
      await markScheduledSend(admin, profile.alumno_id, job, scheduledFor, result.sent, result.reason)

      if (result.sent) sent += 1
      else skipped += 1
    }
  }

  return json({
    ok: true,
    sent,
    skipped,
    trial_expired: trialExpired,
    trial_warned: trialWarned,
    checked: profiles?.length ?? 0,
  })
}

export default webHandler(handler)
