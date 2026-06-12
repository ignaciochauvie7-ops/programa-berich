import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { getQuizProfile } from '../_lib/coach/quizProfile.js'
import {
  jobsDueNow,
  markScheduledSend,
  processPendingInboundReplies,
  sendProactiveMessage,
  wasAlreadyScheduled,
} from '../_lib/coach/proactive.js'
import type { CoachProfile } from '../_lib/coach/types.js'

function authorizeCron(request: Request): boolean {
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
    .not('phone_e164', 'is', null)

  if (error) {
    console.error('[coach cron]', error)
    return json({ error: 'query failed' }, 500)
  }

  const inboundReplies = await processPendingInboundReplies(admin)

  let sent = inboundReplies.sent
  let skipped = inboundReplies.skipped

  for (const row of profiles ?? []) {
    const alumno = row.alumnos as { email: string; nombre: string | null; activo: boolean }
    if (!alumno.activo) continue

    const profile = row as CoachProfile
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
    inbound_replies: inboundReplies,
    checked: profiles?.length ?? 0,
  })
}

export default webHandler(handler)
