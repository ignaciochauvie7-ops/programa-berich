import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findAlumnoForUser, getCoachProfile } from '../_lib/coach/alumnoCoach.js'
import { computeCoachTargets } from '../_lib/coach/nutrition.js'
import { getQuizProfile } from '../_lib/coach/quizProfile.js'
import type { ActivityLevel, CoachGoal } from '../_lib/coach/types.js'

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']

type Body = {
  training_days?: number[]
  timezone?: string
  activity_level?: ActivityLevel
  opt_in?: boolean
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email || !user.id) return json({ error: 'unauthorized' }, 401)

  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  if (!body.opt_in) {
    return json({ error: 'Tenés que aceptar recibir notificaciones de acompañamiento.' }, 400)
  }

  const trainingDays = (body.training_days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  if (trainingDays.length < 1) {
    return json({ error: 'Elegí al menos un día de entrenamiento.' }, 400)
  }

  const activityLevel = body.activity_level
  if (!activityLevel || !ACTIVITY_LEVELS.includes(activityLevel)) {
    return json({ error: 'Elegí cuántas veces por semana vas a entrenar (actividad física).' }, 400)
  }

  const timezone = String(body.timezone ?? 'America/Montevideo').trim() || 'America/Montevideo'

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const alumno = await findAlumnoForUser(admin, user.id, user.email)
  if (!alumno?.activo) {
    return json({ error: 'Tu cuenta no está activa todavía.' }, 403)
  }

  const quiz = await getQuizProfile(admin, alumno.id)
  const goal: CoachGoal = quiz?.goal ?? 'Recomposición corporal'
  const weightKg = quiz?.weight_kg ?? 75

  const targets = computeCoachTargets(weightKg, activityLevel, goal)
  const now = new Date().toISOString()

  const { error: upsertError } = await admin.from('alumno_coach_profile').upsert(
    {
      alumno_id: alumno.id,
      timezone,
      training_days: [...new Set(trainingDays)].sort((a, b) => a - b),
      goal,
      activity_level: activityLevel,
      maintenance_kcal: targets.maintenance_kcal,
      calorie_target: targets.calorie_target,
      calorie_cap: targets.calorie_cap,
      water_ml_base: targets.water_ml_base,
      water_ml_training_extra: targets.water_ml_training_extra,
      steps_target: targets.steps_target,
      opt_in_at: now,
      setup_completed_at: now,
      coach_active: true,
      updated_at: now,
    },
    { onConflict: 'alumno_id' },
  )

  if (upsertError) {
    console.error('[coach enroll]', upsertError)
    return json({ error: 'No se pudo guardar tu perfil.' }, 500)
  }

  return json({ ok: true, alumno_id: alumno.id })
}

export default webHandler(handler)
