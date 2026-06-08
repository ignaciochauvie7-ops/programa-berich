import type { SupabaseClient } from '@supabase/supabase-js'
import { getActivationOrigin } from './auth.js'
import { sendProgramInviteEmail } from './email.js'
import { normalizeEmail } from './supabaseAdmin.js'

type ProvisionResult =
  | { ok: true; alumno: { id: string; email: string; activo: boolean } }
  | { ok: false; error: string }

type ProvisionOptions = {
  nombre?: string
  source?: string
  productSlug?: string
  /** Tras pago o invitación admin el alumno ya tiene acceso al programa. */
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
 * Alta de alumno activo + mail para crear contraseña (/activar-cuenta).
 * Usado por panel admin, webhooks de pago, etc.
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
  const activo = options?.activo !== false
  const redirectTo = `${getActivationOrigin()}/activar-cuenta`

  const linkResult = await resolveInviteActionLink(admin, email, redirectTo, nombre)
  if ('error' in linkResult) {
    console.error('[provisionAlumnoInvite]', linkResult.error, email)
    return { ok: false, error: linkResult.error }
  }

  const sent = await sendProgramInviteEmail({
    to: email,
    inviteUrl: linkResult.actionLink,
    productLabel: PRODUCT_LABEL,
  })

  if (!sent.sent) {
    const detail = 'error' in sent ? sent.error : 'RESEND no configurado o dominio sin verificar'
    console.error('[provisionAlumnoInvite] mail no enviado', detail, email, linkResult.actionLink)
    return { ok: false, error: 'no se pudo enviar el mail de invitación' }
  }

  console.info('[provisionAlumnoInvite] mail enviado', email)

  const { data: alumno, error: upsertError } = await admin
    .from('alumnos')
    .upsert(
      {
        user_id: linkResult.userId,
        email,
        nombre,
        activo,
      },
      { onConflict: 'email' },
    )
    .select('id, email, activo')
    .single()

  if (upsertError || !alumno) {
    console.error('[provisionAlumnoInvite] alumnos', upsertError)
    return { ok: false, error: 'mail enviado, pero no se pudo guardar el alumno' }
  }

  if (productSlug) {
    await admin.from('entitlements').upsert(
      { email, product_slug: productSlug, source: options?.source ?? 'invite' },
      { onConflict: 'email,product_slug' },
    )
  }

  return { ok: true, alumno }
}

/** Enlaza user_id tras crear contraseña (activo ya true tras pago/invite). */
export async function activateAlumnoRecord(
  admin: SupabaseClient,
  userId: string,
  rawEmail: string,
): Promise<ProvisionResult> {
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
