import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findAlumnoForUser, getCoachProfile } from '../_lib/coach/alumnoCoach.js'
import { formatKcal, formatLiters } from '../_lib/coach/nutrition.js'
import { getQuizProfile } from '../_lib/coach/quizProfile.js'
import { syncCoachTargetsForAlumno } from '../_lib/coach/syncCoachTargets.js'
import type { ActivityLevel, CoachGoal } from '../_lib/coach/types.js'

const GOALS: CoachGoal[] = ['Ganar músculo', 'Perder grasa', 'Recomposición corporal']
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

const MUSCLE_IMPEDIMENTS = [
  'No sé por dónde empezar',
  'Como mucho y no subo de peso',
  'Entreno pero no crezco',
  'No noto cambios',
  'No tengo tiempo para entrenar',
] as const

const FAT_RECOMP_IMPEDIMENTS = [
  'Hambre constante y ansiedad',
  'No saber qué comer',
  'Odio hacer dieta',
  'Falta de tiempo',
  'Me cuesta ser constante',
  'No sé por dónde empezar',
] as const

function isCoachGoal(value: string): value is CoachGoal {
  return (GOALS as string[]).includes(value)
}

function impedimentPathForGoal(goal: CoachGoal): 'musculo' | 'grasa-recomp' {
  return goal === 'Ganar músculo' ? 'musculo' : 'grasa-recomp'
}

function isValidImpediment(goal: CoachGoal, impediment: string): boolean {
  const pool = goal === 'Ganar músculo' ? MUSCLE_IMPEDIMENTS : FAT_RECOMP_IMPEDIMENTS
  return (pool as readonly string[]).includes(impediment)
}

type UpdateBody = {
  sex?: 'hombre' | 'mujer'
  age_range?: string
  height_cm?: number
  weight_kg?: number
  peso_ideal_kg?: number | null
  goal?: CoachGoal
  impediment?: string
  training_days?: number[]
  activity_level?: ActivityLevel
}

async function getProfilePayload(admin: ReturnType<typeof getSupabaseAdmin>, alumnoId: string) {
  const quiz = await getQuizProfile(admin!, alumnoId)
  const coach = await getCoachProfile(admin!, alumnoId)

  if (!quiz) {
    return { has_quiz: false as const }
  }

  return {
    has_quiz: true as const,
    quiz: {
      sex: quiz.sex,
      age_range: quiz.age_range,
      height_cm: quiz.height_cm,
      weight_kg: quiz.weight_kg,
      peso_ideal_kg: quiz.peso_ideal_kg,
      goal: quiz.goal,
      impediment: quiz.impediment,
      impediment_path: quiz.impediment_path,
    },
    coach: coach
      ? {
          training_days: coach.training_days,
          activity_level: coach.activity_level,
          timezone: coach.timezone,
          phone_linked: Boolean(coach.phone_e164),
          coach_active: coach.coach_active,
          maintenance_kcal: coach.maintenance_kcal,
          calorie_target: coach.calorie_target,
          calorie_cap: coach.calorie_cap,
          water_ml_base: coach.water_ml_base,
          water_ml_training_extra: coach.water_ml_training_extra,
          steps_target: coach.steps_target,
        }
      : null,
    targets: coach?.calorie_target
      ? {
          calorie_target_label: formatKcal(coach.calorie_target),
          calorie_cap_label: coach.calorie_cap ? formatKcal(coach.calorie_cap) : null,
          water_liters: coach.water_ml_base ? formatLiters(coach.water_ml_base) : null,
          water_training_extra_liters: coach.water_ml_training_extra
            ? formatLiters(coach.water_ml_training_extra)
            : null,
          steps_target: coach.steps_target,
        }
      : null,
  }
}

async function handler(request: Request): Promise<Response> {
  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email || !user.id) return json({ error: 'unauthorized' }, 401)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const alumno = await findAlumnoForUser(admin, user.id, user.email)
  if (!alumno?.activo) {
    return json({ error: 'Tu cuenta no está activa.' }, 403)
  }

  if (request.method === 'GET') {
    const payload = await getProfilePayload(admin, alumno.id)
    return json(payload)
  }

  if (request.method !== 'PATCH') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: UpdateBody = {}
  try {
    body = (await request.json()) as UpdateBody
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const quiz = await getQuizProfile(admin, alumno.id)
  if (!quiz) {
    return json({ error: 'No encontramos tu perfil del quiz.' }, 404)
  }

  const coach = await getCoachProfile(admin, alumno.id)
  if (!coach) {
    return json({ error: 'Completá primero la configuración de WhatsApp.' }, 404)
  }

  const sex = body.sex === 'hombre' || body.sex === 'mujer' ? body.sex : quiz.sex
  const age_range =
    typeof body.age_range === 'string' && body.age_range.trim() ? body.age_range.trim().slice(0, 32) : quiz.age_range

  const height_cm = body.height_cm !== undefined ? Number(body.height_cm) : quiz.height_cm
  const weight_kg = body.weight_kg !== undefined ? Number(body.weight_kg) : quiz.weight_kg

  if (!Number.isFinite(height_cm) || height_cm < 120 || height_cm > 230) {
    return json({ error: 'Altura inválida (120–230 cm).' }, 400)
  }
  if (!Number.isFinite(weight_kg) || weight_kg < 35 || weight_kg > 250) {
    return json({ error: 'Peso inválido (35–250 kg).' }, 400)
  }

  let peso_ideal_kg: number | null = quiz.peso_ideal_kg
  if (body.peso_ideal_kg !== undefined) {
    if (body.peso_ideal_kg === null) {
      peso_ideal_kg = null
    } else {
      const ideal = Number(body.peso_ideal_kg)
      if (!Number.isFinite(ideal) || ideal < 35 || ideal > 250) {
        return json({ error: 'Peso ideal inválido (35–250 kg).' }, 400)
      }
      peso_ideal_kg = ideal
    }
  }

  const goal = body.goal && isCoachGoal(body.goal) ? body.goal : quiz.goal
  const impediment_path = impedimentPathForGoal(goal)

  let impediment = typeof body.impediment === 'string' ? body.impediment.trim() : quiz.impediment
  if (!isValidImpediment(goal, impediment)) {
    impediment =
      goal === 'Ganar músculo' ? MUSCLE_IMPEDIMENTS[0]! : FAT_RECOMP_IMPEDIMENTS[0]!
  }

  const trainingDays =
    body.training_days !== undefined
      ? body.training_days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      : coach.training_days

  if (trainingDays.length < 1) {
    return json({ error: 'Elegí al menos un día de entrenamiento.' }, 400)
  }

  const activityLevel =
    body.activity_level && ACTIVITY_LEVELS.includes(body.activity_level)
      ? body.activity_level
      : (coach.activity_level ?? 'moderate')

  const { error: quizError } = await admin
    .from('alumno_quiz_profile')
    .update({
      sex,
      age_range,
      height_cm,
      weight_kg,
      peso_ideal_kg,
      goal,
      impediment,
      impediment_path,
    })
    .eq('alumno_id', alumno.id)

  if (quizError) {
    console.error('[my-profile] quiz update', quizError)
    return json({ error: 'No se pudo actualizar tu perfil.' }, 500)
  }

  const synced = await syncCoachTargetsForAlumno(admin, alumno.id, {
    weightKg: weight_kg,
    activityLevel,
    goal,
    trainingDays,
  })

  if (!synced.ok) {
    return json({ error: 'No se pudieron recalcular tus metas.' }, 500)
  }

  const payload = await getProfilePayload(admin, alumno.id)
  return json({ ok: true, ...payload })
}

export default webHandler(handler)
