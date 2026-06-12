import type { ActivityLevel, CoachGoal } from './types.js'

/** Multiplicadores de actividad (peso × 22 × factor). */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Poco o nada',
  light: '1-3 veces por semana',
  moderate: '3-5 veces por semana',
  active: '6-7 veces por semana',
  very_active: 'Muy intenso todos los días',
}

export type CoachTargets = {
  maintenance_kcal: number
  calorie_target: number
  calorie_cap: number
  water_ml_base: number
  water_ml_training_extra: number
  steps_target: number
}

/** Mantenimiento: peso (kg) × 22 × actividad. Ajustes por objetivo para mensajes. */
export function computeCoachTargets(
  weightKg: number,
  activityLevel: ActivityLevel,
  goal: CoachGoal,
): CoachTargets {
  const weight = Math.max(40, Math.min(200, weightKg))
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel]
  const maintenance = Math.round(weight * 22 * multiplier)

  let calorie_target = maintenance
  let calorie_cap = maintenance

  switch (goal) {
    case 'Perder grasa':
      calorie_target = maintenance - 400
      calorie_cap = maintenance - 150
      break
    case 'Ganar músculo':
      calorie_target = maintenance + 250
      calorie_cap = maintenance + 400
      break
    case 'Recomposición corporal':
      calorie_target = maintenance
      calorie_cap = maintenance + 150
      break
  }

  const water_ml_base = Math.round(weight * 35)
  const steps_target = goal === 'Perder grasa' ? 10_000 : 3_000

  return {
    maintenance_kcal: maintenance,
    calorie_target,
    calorie_cap,
    water_ml_base,
    water_ml_training_extra: 500,
    steps_target,
  }
}

export function formatLiters(ml: number): string {
  const liters = ml / 1000
  if (liters >= 1) {
    const rounded = Math.round(liters * 10) / 10
    return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1).replace('.', ',')
  }
  return String(Math.round(ml))
}

export function formatKcal(kcal: number): string {
  return new Intl.NumberFormat('es-UY').format(kcal)
}
