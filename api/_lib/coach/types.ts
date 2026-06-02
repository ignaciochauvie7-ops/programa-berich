export type CoachGoal = 'Ganar músculo' | 'Perder grasa' | 'Recomposición corporal'

export type ProactiveJobType =
  | 'training_reminder'
  | 'hydration'
  | 'nutrition'
  | 'weekly_check'
  | 'reengagement'

export type CoachProfile = {
  alumno_id: string
  phone_e164: string
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
}

export type AlumnoRow = {
  id: string
  email: string
  nombre: string | null
  activo: boolean
}
