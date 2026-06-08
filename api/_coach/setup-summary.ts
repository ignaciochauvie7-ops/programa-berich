import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findAlumnoForUser } from '../_lib/coach/alumnoCoach.js'
import { computeCoachTargets, formatKcal, formatLiters, ACTIVITY_LABELS } from '../_lib/coach/nutrition.js'
import { getQuizProfile } from '../_lib/coach/quizProfile.js'
import type { ActivityLevel } from '../_lib/coach/types.js'

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email || !user.id) return json({ error: 'unauthorized' }, 401)

  const url = new URL(request.url)
  const activityLevel = url.searchParams.get('activity_level') as ActivityLevel | null

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const alumno = await findAlumnoForUser(admin, user.id, user.email)
  if (!alumno?.activo) {
    return json({ has_quiz: false, reason: 'no_active_alumno' })
  }

  const quiz = await getQuizProfile(admin, alumno.id)
  if (!quiz) {
    return json({ has_quiz: false })
  }

  const preview =
    activityLevel && activityLevel in ACTIVITY_LABELS
      ? computeCoachTargets(quiz.weight_kg, activityLevel, quiz.goal)
      : null

  return json({
    has_quiz: true,
    sex: quiz.sex,
    goal: quiz.goal,
    impediment: quiz.impediment,
    weight_kg: quiz.weight_kg,
    height_cm: quiz.height_cm,
    preview: preview
      ? {
          maintenance_kcal: preview.maintenance_kcal,
          calorie_target: preview.calorie_target,
          calorie_cap: preview.calorie_cap,
          water_liters: formatLiters(preview.water_ml_base),
          steps_target: preview.steps_target,
          calorie_target_label: formatKcal(preview.calorie_target),
        }
      : null,
  })
}

export default webHandler(handler)
