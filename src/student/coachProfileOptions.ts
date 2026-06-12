export const DAY_OPTIONS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
] as const

export const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Poco o nada' },
  { value: 'light', label: '1-3 veces por semana' },
  { value: 'moderate', label: '3-5 veces por semana' },
  { value: 'active', label: '6-7 veces por semana' },
  { value: 'very_active', label: 'Muy intenso todos los días' },
] as const

export const AGE_OPTIONS = ['Menos de 20', '20-30', '30-45', '45-60', 'Más de 60'] as const

export const GOAL_OPTIONS = ['Ganar músculo', 'Perder grasa', 'Recomposición corporal'] as const

export const MUSCLE_IMPEDIMENT_OPTIONS = [
  'No sé por dónde empezar',
  'Como mucho y no subo de peso',
  'Entreno pero no crezco',
  'No noto cambios',
  'No tengo tiempo para entrenar',
] as const

export const FAT_RECOMP_IMPEDIMENT_OPTIONS = [
  'Hambre constante y ansiedad',
  'No saber qué comer',
  'Odio hacer dieta',
  'Falta de tiempo',
  'Me cuesta ser constante',
  'No sé por dónde empezar',
] as const

export type ActivityLevel = (typeof ACTIVITY_OPTIONS)[number]['value']
export type GoalOption = (typeof GOAL_OPTIONS)[number]

export function impedimentOptionsForGoal(goal: GoalOption): readonly string[] {
  return goal === 'Ganar músculo' ? MUSCLE_IMPEDIMENT_OPTIONS : FAT_RECOMP_IMPEDIMENT_OPTIONS
}

export function dayLabels(days: number[]): string {
  return DAY_OPTIONS.filter((d) => days.includes(d.value))
    .map((d) => d.label)
    .join(', ')
}

export function activityLabel(level: string | null | undefined): string {
  return ACTIVITY_OPTIONS.find((o) => o.value === level)?.label ?? '—'
}
