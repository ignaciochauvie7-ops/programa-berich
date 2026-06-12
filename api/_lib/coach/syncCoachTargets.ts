import type { SupabaseClient } from '@supabase/supabase-js'
import { computeCoachTargets } from './nutrition.js'
import type { ActivityLevel, CoachGoal } from './types.js'

export function coachTargetFields(
  weightKg: number,
  activityLevel: ActivityLevel,
  goal: CoachGoal,
): {
  goal: CoachGoal
  activity_level: ActivityLevel
  maintenance_kcal: number
  calorie_target: number
  calorie_cap: number
  water_ml_base: number
  water_ml_training_extra: number
  steps_target: number
} {
  const targets = computeCoachTargets(weightKg, activityLevel, goal)
  return {
    goal,
    activity_level: activityLevel,
    maintenance_kcal: targets.maintenance_kcal,
    calorie_target: targets.calorie_target,
    calorie_cap: targets.calorie_cap,
    water_ml_base: targets.water_ml_base,
    water_ml_training_extra: targets.water_ml_training_extra,
    steps_target: targets.steps_target,
  }
}

export async function syncCoachTargetsForAlumno(
  admin: SupabaseClient,
  alumnoId: string,
  params: {
    weightKg: number
    activityLevel: ActivityLevel
    goal: CoachGoal
    trainingDays?: number[]
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString()
  const fields = coachTargetFields(params.weightKg, params.activityLevel, params.goal)
  const patch: Record<string, unknown> = {
    ...fields,
    updated_at: now,
  }
  if (params.trainingDays) {
    patch.training_days = [...new Set(params.trainingDays)].sort((a, b) => a - b)
  }

  const { data: existing } = await admin
    .from('alumno_coach_profile')
    .select('alumno_id')
    .eq('alumno_id', alumnoId)
    .maybeSingle()

  if (!existing) {
    return { ok: false, error: 'coach profile not found' }
  }

  const { error } = await admin.from('alumno_coach_profile').update(patch).eq('alumno_id', alumnoId)
  if (error) {
    console.error('[syncCoachTargets]', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
