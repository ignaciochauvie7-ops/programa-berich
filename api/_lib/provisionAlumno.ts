import type { SupabaseClient } from '@supabase/supabase-js'
import { getActivationOrigin } from './auth.js'
import { sendProgramInviteEmail } from './email.js'
import { normalizeEmail } from './supabaseAdmin.js'

type ProvisionResult =
  | { ok: true; alumno: { id: string; email: string; activo: boolean }; mailSent: boolean }
  | { ok: false; error: string }

type ProvisionOptions = {
  nombre?: string
  source?: string
  productSlug?: string
  /** false = Pendiente en panel hasta que crea contraseña; true = Activo de inmediato. */
  activo?: boolean
}

const PRODUCT_LABEL = 'Programa Berich Completo'

function readInviteActionLink(linkData: {
  properties?: { action_link?: string | null } | null
  action_link?: string | null
} | null | undefined): string | null {
  if (!linkData) return null
  const url = linkData.properties?.action_link ?? linkData.action_link
  return typeof url === 'string' && url.startsWith('http') ? url : null
}

async function resolveInviteActionLink(
  admin: SupabaseClient,
  email: string,
  redirectTo: string,
  nombre: string | null,
): Promise<{ userId: string | null; actionLink: string } | { error: string }> {
  const inviteOptions = { redirectTo, data: nombre ? { nombre } : undefined }

  const invite = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: inviteOptions,
  })

  const inviteLink = readInviteActionLink(invite.data)
  if (inviteLink) {
    return { userId: invite.data?.user?.id ?? null, actionLink: inviteLink }
  }

  const recovery = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  const recoveryLink = readInviteActionLink(recovery.data)
  if (recoveryLink) {
    return { userId: recovery.data?.user?.id ?? null, actionLink: recoveryLink }
  }

  const errMsg =
    invite.error?.message ?? recovery.error?.message ?? 'no se pudo generar el link de invitación'
  return { error: errMsg }
}

/**
 * Alta de alumno + mail para crear contraseña (/activar-cuenta).
 * El alumno se guarda siempre; el mail es best-effort (no bloquea el alta).
 */
export async function provisionAlumnoInvite(
  admin: SupabaseClient,
  rawEmail: string,
  options?: ProvisionOptions,
): Promise<ProvisionResult> {
  const email = normalizeEmail(rawEmail)
  if (!email.includes('@')) return { ok: false, error: 'email inválido' }

  const nombre = options?.nombre?.trim() || null
  const productSlug = (options?.productSlug ?? process.env.PRODUCT_SLUG ?? 'berich-completo').trim()
  const activo = options?.activo ?? false

  const { data: existing } = await admin
    .from('alumnos')
    .select('id, user_id, activo')
    .eq('email', email)
    .maybeSingle()

  const row: { email: string; nombre: string | null; activo: boolean; user_id?: string | null } = {
    email,
    nombre,
    activo: existing?.activo === true ? true : activo,
  }
  if (existing?.user_id) row.user_id = existing.user_id

  const { data: alumno, error: upsertError } = await admin
    .from('alumnos')
    .upsert(row, { onConflict: 'email' })
    .select('id, email, activo')
    .single()

  if (upsertError || !alumno) {
    console.error('[provisionAlumnoInvite] alumnos', upsertError)
    return { ok: false, error: 'no se pudo guardar el alumno' }
  }

  if (productSlug) {
    await admin.from('entitlements').upsert(
      { email, product_slug: productSlug, source: options?.source ?? 'invite' },
      { onConflict: 'email,product_slug' },
    )
  }

  console.info('[provisionAlumnoInvite] alumno guardado', email, activo ? 'activo' : 'pendiente')

  const redirectTo = `${getActivationOrigin()}/activar-cuenta`
  const linkResult = await resolveInviteActionLink(admin, email, redirectTo, nombre)

  if ('error' in linkResult) {
    console.warn('[provisionAlumnoInvite] sin link de invitación', linkResult.error, email)
    return { ok: true, alumno, mailSent: false }
  }

  if (linkResult.userId) {
    await admin.from('alumnos').update({ user_id: linkResult.userId }).eq('id', alumno.id)
  }

  const sent = await sendProgramInviteEmail({
    to: email,
    inviteUrl: linkResult.actionLink,
    productLabel: PRODUCT_LABEL,
  })

  if (!sent.sent) {
    const detail = 'error' in sent ? sent.error : 'RESEND no configurado o dominio sin verificar'
    console.warn('[provisionAlumnoInvite] mail no enviado (alumno ya creado)', detail, email)
    return { ok: true, alumno, mailSent: false }
  }

  console.info('[provisionAlumnoInvite] mail enviado', email)
  return { ok: true, alumno, mailSent: true }
}

/** Enlaza user_id y marca activo tras crear contraseña en /activar-cuenta. */
export async function activateAlumnoRecord(
  admin: SupabaseClient,
  userId: string,
  rawEmail: string,
): Promise<{ ok: true; alumno: { id: string; email: string; activo: boolean } } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail)

  const { data: alumno, error } = await admin
    .from('alumnos')
    .upsert(
      { email, user_id: userId, activo: true },
      { onConflict: 'email' },
    )
    .select('id, email, activo')
    .single()

  if (error || !alumno) {
    console.error('[activateAlumnoRecord]', error)
    return { ok: false, error: 'no se pudo activar el alumno' }
  }

  return { ok: true, alumno }
}
