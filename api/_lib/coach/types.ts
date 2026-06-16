export type CoachGoal = 'Ganar músculo' | 'Perder grasa' | 'Recomposición corporal'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export type ProactiveJobType = 'daily_digest'

export type CoachProfile = {
  alumno_id: string
  phone_e164: string | null
  push_subscription: Record<string, unknown> | null
  timezone: string
  training_days: number[]
  preferred_hour: string
  goal: CoachGoal
  opt_in_at: string
  setup_completed_at: string
  coach_active: boolean
  last_inbound_at: string | null
  last_outbound_at: string | null
  last_user_reply_at: string | null
  activity_level: ActivityLevel | null
  maintenance_kcal: number | null
  calorie_target: number | null
  calorie_cap: number | null
  water_ml_base: number | null
  water_ml_training_extra: number | null
  steps_target: number | null
}

export type QuizProfile = {
  alumno_id: string
  quiz_variant: string
  sex: 'hombre' | 'mujer'
  age_range: string
  height_cm: number
  weight_kg: number
  peso_ideal_kg: number | null
  goal: CoachGoal
  impediment: string
  impediment_path: 'musculo' | 'grasa-recomp'
}

export type AlumnoRow = {
  id: string
  email: string
  nombre: string | null
  activo: boolean
}

export type CoachProfileWithQuiz = CoachProfile & {
  quiz: QuizProfile | null
}
