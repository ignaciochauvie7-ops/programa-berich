import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeEmail } from '../supabaseAdmin.js'
import type { AlumnoRow, CoachProfile } from './types.js'

export async function findAlumnoForUser(
  admin: SupabaseClient,
  userId: string,
  email: string,
): Promise<AlumnoRow | null> {
  const byUser = await admin
    .from('alumnos')
    .select('id, email, nombre, activo')
    .eq('user_id', userId)
    .maybeSingle()

  if (byUser.data) return byUser.data as AlumnoRow

  const byEmail = await admin
    .from('alumnos')
    .select('id, email, nombre, activo')
    .ilike('email', normalizeEmail(email))
    .maybeSingle()

  return (byEmail.data as AlumnoRow | null) ?? null
}

export async function getCoachProfile(
  admin: SupabaseClient,
  alumnoId: string,
): Promise<CoachProfile | null> {
  const { data, error } = await admin
    .from('alumno_coach_profile')
    .select('*')
    .eq('alumno_id', alumnoId)
    .maybeSingle()

  if (error || !data) return null
  return data as CoachProfile
}

export function parseSetupRefFromText(text: string): string | null {
  const match = text.match(/\bref[:\s]+([a-f0-9]{8})\b/i)
  return match?.[1]?.toLowerCase() ?? null
}

export async function findPendingProfileByRef(
  admin: SupabaseClient,
  ref: string,
): Promise<(CoachProfile & { nombre: string | null; email: string }) | null> {
  const normalized = ref.trim().toLowerCase()
  if (!/^[a-f0-9]{8}$/.test(normalized)) return null

  const { data, error } = await admin
    .from('alumno_coach_profile')
    .select('*, alumnos!inner(email, nombre, activo)')
    .is('phone_e164', null)
    .like('alumno_id', `${normalized}%`)
    .maybeSingle()

  if (error || !data) return null

  const row = data as CoachProfile & { alumnos: { email: string; nombre: string | null; activo: boolean } }
  if (!row.alumnos.activo || !row.coach_active || !row.setup_completed_at) return null

  return {
    ...row,
    email: row.alumnos.email,
    nombre: row.alumnos.nombre,
  }
}

export async function attachPhoneToProfile(
  admin: SupabaseClient,
  alumnoId: string,
  phoneE164: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await admin
    .from('alumno_coach_profile')
    .update({ phone_e164: phoneE164, updated_at: new Date().toISOString() })
    .eq('alumno_id', alumnoId)
    .is('phone_e164', null)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'phone already linked' }
    }
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function findProfileByPhone(
  admin: SupabaseClient,
  phoneE164: string,
): Promise<(CoachProfile & { nombre: string | null; email: string }) | null> {
  const { data, error } = await admin
    .from('alumno_coach_profile')
    .select('*, alumnos!inner(email, nombre, activo)')
    .eq('phone_e164', phoneE164)
    .maybeSingle()

  if (error || !data) return null

  const row = data as CoachProfile & { alumnos: { email: string; nombre: string | null; activo: boolean } }
  if (!row.alumnos.activo || !row.coach_active) return null

  return {
    ...row,
    email: row.alumnos.email,
    nombre: row.alumnos.nombre,
  }
}

export async function saveCoachMessage(
  admin: SupabaseClient,
  params: {
    alumnoId: string
    direction: 'inbound' | 'outbound'
    messageType: 'text' | 'template' | 'proactive' | 'reply'
    body: string
    waMessageId?: string | null
    templateName?: string | null
    status?: string
  },
): Promise<void> {
  await admin.from('coach_messages').insert({
    alumno_id: params.alumnoId,
    direction: params.direction,
    message_type: params.messageType,
    body: params.body,
    wa_message_id: params.waMessageId ?? null,
    template_name: params.templateName ?? null,
    status: params.status ?? (params.direction === 'inbound' ? 'received' : 'sent'),
  })
}

export async function touchProfileTimestamps(
  admin: SupabaseClient,
  alumnoId: string,
  patch: Partial<Pick<CoachProfile, 'last_inbound_at' | 'last_outbound_at' | 'last_user_reply_at'>>,
): Promise<void> {
  await admin
    .from('alumno_coach_profile')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('alumno_id', alumnoId)
}

export function displayName(nombre: string | null | undefined, email: string): string {
  const clean = nombre?.trim()
  if (clean) return clean.split(/\s+/)[0] ?? clean
  return email.split('@')[0] ?? 'ahí'
}
