import type { SupabaseClient } from '@supabase/supabase-js'
import type { CoachGoal, QuizProfile } from './types.js'

export type QuizSnapshotInput = {
  variant: string
  sex: 'hombre' | 'mujer'
  age_range: string
  height_cm: number
  weight_kg: number
  peso_ideal_kg?: number | null
  goal: CoachGoal
  impediment: string
  impediment_path: 'musculo' | 'grasa-recomp'
}

const GOALS: CoachGoal[] = ['Ganar músculo', 'Perder grasa', 'Recomposición corporal']

function isCoachGoal(value: string): value is CoachGoal {
  return (GOALS as string[]).includes(value)
}

export function parseQuizSnapshotFromMetadata(metadata: unknown): QuizSnapshotInput | null {
  if (!metadata || typeof metadata !== 'object' || metadata === null) return null
  const meta = metadata as Record<string, unknown>

  const rawJson = meta.quiz_json
  if (typeof rawJson === 'string' && rawJson.trim()) {
    try {
      return normalizeQuizSnapshot(JSON.parse(rawJson) as Record<string, unknown>)
    } catch {
      return null
    }
  }

  if (meta.quiz && typeof meta.quiz === 'object' && meta.quiz !== null) {
    return normalizeQuizSnapshot(meta.quiz as Record<string, unknown>)
  }

  return null
}

function normalizeQuizSnapshot(raw: Record<string, unknown>): QuizSnapshotInput | null {
  const variant = typeof raw.variant === 'string' ? raw.variant.trim().slice(0, 8) : ''
  const sex = raw.sex === 'hombre' || raw.sex === 'mujer' ? raw.sex : null
  const age_range = typeof raw.age_range === 'string' ? raw.age_range.trim().slice(0, 32) : ''
  const height_cm = Number(raw.height_cm)
  const weight_kg = Number(raw.weight_kg)
  const goalRaw = typeof raw.goal === 'string' ? raw.goal.trim() : ''
  const impediment = typeof raw.impediment === 'string' ? raw.impediment.trim().slice(0, 120) : ''
  const path = raw.impediment_path === 'musculo' || raw.impediment_path === 'grasa-recomp' ? raw.impediment_path : null

  if (!variant || !sex || !age_range || !isCoachGoal(goalRaw) || !impediment || !path) return null
  if (!Number.isFinite(height_cm) || height_cm < 120 || height_cm > 230) return null
  if (!Number.isFinite(weight_kg) || weight_kg < 35 || weight_kg > 250) return null

  const peso_ideal = Number(raw.peso_ideal_kg)
  const peso_ideal_kg = Number.isFinite(peso_ideal) && peso_ideal >= 35 && peso_ideal <= 250 ? peso_ideal : null

  return {
    variant,
    sex,
    age_range,
    height_cm,
    weight_kg,
    peso_ideal_kg,
    goal: goalRaw,
    impediment,
    impediment_path: path,
  }
}

export function compactQuizJson(snapshot: QuizSnapshotInput): string {
  return JSON.stringify(snapshot)
}

export async function saveQuizProfileForAlumno(
  admin: SupabaseClient,
  alumnoId: string,
  snapshot: QuizSnapshotInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Check if the profile already exists so we don't overwrite purchased_at
  const { data: existing } = await admin
    .from('alumno_quiz_profile')
    .select('alumno_id')
    .eq('alumno_id', alumnoId)
    .maybeSingle()

  const payload: Record<string, unknown> = {
    alumno_id: alumnoId,
    quiz_variant: snapshot.variant,
    sex: snapshot.sex,
    age_range: snapshot.age_range,
    height_cm: snapshot.height_cm,
    weight_kg: snapshot.weight_kg,
    peso_ideal_kg: snapshot.peso_ideal_kg,
    goal: snapshot.goal,
    impediment: snapshot.impediment,
    impediment_path: snapshot.impediment_path,
  }

  // Only set purchased_at on first insert, never overwrite it
  if (!existing) {
    payload.purchased_at = new Date().toISOString()
  }

  const { error } = await admin.from('alumno_quiz_profile').upsert(payload, { onConflict: 'alumno_id' })

  if (error) {
    console.error('[saveQuizProfile]', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function getQuizProfile(admin: SupabaseClient, alumnoId: string): Promise<QuizProfile | null> {
  const { data, error } = await admin.from('alumno_quiz_profile').select('*').eq('alumno_id', alumnoId).maybeSingle()

  if (error || !data) return null
  return data as QuizProfile
}

export async function findAlumnoIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const { data } = await admin.from('alumnos').select('id').ilike('email', email.trim().toLowerCase()).maybeSingle()
  return data?.id ?? null
}
