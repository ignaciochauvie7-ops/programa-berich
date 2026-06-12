import type { SupabaseClient } from '@supabase/supabase-js'
import { formatKcal, formatLiters, type CoachTargets } from './nutrition.js'
import { displayName, saveCoachMessage, touchProfileTimestamps } from './alumnoCoach.js'
import { getQuizProfile } from './quizProfile.js'
import type { CoachGoal, CoachProfile, QuizProfile } from './types.js'
import { isWhatsAppConfigured, sendWhatsAppText } from '../whatsapp/client.js'

const DAY_LABELS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

function formatTrainingDays(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  if (!sorted.length) return ''
  const labels = sorted.map((d) => DAY_LABELS[d] ?? String(d))
  if (labels.length === 1) return labels[0]!
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}

/** Mensaje estándar del día 1 tras vincular WhatsApp. */
export function buildWelcomeMessage(params: {
  nombre: string | null
  email: string
  goal: CoachGoal
  targets: CoachTargets
  trainingDays: number[]
  quiz: QuizProfile | null
}): string {
  const name = displayName(params.nombre, params.email)
  const goal = params.goal.toLowerCase()
  const kcal = formatKcal(params.targets.calorie_target)
  const water = formatLiters(params.targets.water_ml_base)
  const steps = new Intl.NumberFormat('es-UY').format(params.targets.steps_target)
  const days = formatTrainingDays(params.trainingDays)

  let msg = `¡Bienvenido al Programa Berich, ${name}! Ya quedó todo armado con tus datos del funnel`

  if (params.quiz) {
    msg += `: objetivo ${goal}, referencia ~${kcal} kcal y ~${water}L de agua por día`
  } else {
    msg += `: objetivo ${goal}, referencia ~${kcal} kcal y ~${water}L de agua por día`
  }

  if (days) {
    msg += `. Tus días de entreno: ${days}`
  }

  msg += `. Pasos orientativos: ${steps}/día.`

  if (params.targets.water_ml_training_extra > 0) {
    const extraL = formatLiters(params.targets.water_ml_training_extra)
    msg += ` En días de entreno sumá ~${extraL}L extra de agua.`
  }

  msg += ` Por acá te mando recordatorios útiles y, si tenés dudas, escribime cuando quieras.`

  return msg
}

export async function sendWelcomeAfterPhoneLink(
  admin: SupabaseClient,
  profile: CoachProfile,
  nombre: string | null,
  email: string,
): Promise<boolean> {
  if (!profile.phone_e164 || !isWhatsAppConfigured()) return false

  const { count } = await admin
    .from('coach_messages')
    .select('id', { count: 'exact', head: true })
    .eq('alumno_id', profile.alumno_id)
    .eq('direction', 'outbound')
    .eq('message_type', 'text')
    .ilike('body', '¡Bienvenido al Programa Berich%')

  if ((count ?? 0) > 0) return false

  const quiz = await getQuizProfile(admin, profile.alumno_id)
  const text = buildWelcomeMessage({
    nombre,
    email,
    goal: profile.goal,
    targets: {
      maintenance_kcal: profile.maintenance_kcal ?? 0,
      calorie_target: profile.calorie_target ?? 0,
      calorie_cap: profile.calorie_cap ?? 0,
      water_ml_base: profile.water_ml_base ?? 0,
      water_ml_training_extra: profile.water_ml_training_extra ?? 500,
      steps_target: profile.steps_target ?? 3000,
    },
    trainingDays: profile.training_days,
    quiz,
  })

  const send = await sendWhatsAppText(profile.phone_e164, text)
  if (!send.ok) return false

  const now = new Date().toISOString()
  await saveCoachMessage(admin, {
    alumnoId: profile.alumno_id,
    direction: 'outbound',
    messageType: 'text',
    body: text,
    waMessageId: send.messageId ?? null,
    status: 'sent',
  })
  await touchProfileTimestamps(admin, profile.alumno_id, { last_outbound_at: now })
  return true
}
