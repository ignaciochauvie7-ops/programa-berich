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
