import type { SupabaseClient } from '@supabase/supabase-js'
import { displayName, saveCoachMessage, touchProfileTimestamps } from './alumnoCoach.js'
import { getQuizProfile } from './quizProfile.js'
import type { CoachProfile } from './types.js'
import { isPushConfigured, sendPushNotification } from '../push/client.js'
import type { PushSubscriptionPayload } from '../push/types.js'

/** Mensaje cálido del día 1 tras activar notificaciones. */
export function buildWelcomeMessage(params: {
  nombre: string | null
  email: string
  sex: 'hombre' | 'mujer'
}): string {
  const name = displayName(params.nombre, params.email)
  const label = params.sex === 'mujer' ? 'Bienvenida' : 'Bienvenido'

  return `¡Hola ${name}! Qué bueno que estés en el Programa Berich, ${label}.

Cuando puedas, entrá al programa y mirá los primeros módulos a tu ritmo para irte familiarizando. Ahí está todo lo que necesitas explicado paso a paso.

Por acá te voy a acompañar con recordatorios para que sea más fácil sostener el ritmo. ¡Muchos éxitos con el arranque!`
}

function parseSubscription(profile: CoachProfile): PushSubscriptionPayload | null {
  const raw = profile.push_subscription
  if (!raw || typeof raw !== 'object') return null
  const sub = raw as PushSubscriptionPayload
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return null
  return sub
}

export async function sendWelcomePush(
  admin: SupabaseClient,
  profile: CoachProfile,
  nombre: string | null,
  email: string,
): Promise<boolean> {
  const subscription = parseSubscription(profile)
  if (!subscription || !isPushConfigured()) return false

  const { count } = await admin
    .from('coach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('alumno_id', profile.alumno_id)
    .eq('direction', 'outbound')
    .eq('message_type', 'text')
    .ilike('body', '¡Hola %! Qué bueno que estés en el Programa Berich%')

  if ((count ?? 0) > 0) return false

  const quiz = await getQuizProfile(admin, profile.alumno_id)
  if (!quiz?.sex) return false

  const text = buildWelcomeMessage({ nombre, email, sex: quiz.sex })
  const send = await sendPushNotification(subscription, {
    title: 'Programa Berich',
    body: text,
    url: '/programa',
  })
  if (!send.ok) return false

  const now = new Date().toISOString()
  await saveCoachMessage(admin, {
    alumnoId: profile.alumno_id,
    direction: 'outbound',
    messageType: 'text',
    body: text,
    waMessageId: null,
    status: 'sent',
  })
  await touchProfileTimestamps(admin, profile.alumno_id, { last_outbound_at: now })
  return true
}
