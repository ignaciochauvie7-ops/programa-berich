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

function readInviteActionLink(linkData: {
  properties?: { action_link?: string | null }
}): string | null {
  const url = linkData.properties?.action_link
  return typeof url === 'string' && url.startsWith('http') ? url : null
}

async function sendInviteLinkFallback(email: string, inviteUrl: string): Promise<void> {
  const productLabel = process.env.PRODUCT_SLUG ?? 'Programa Berich'
  const sent = await sendProgramInviteEmail({
    to: email,
    inviteUrl,
    productLabel,
  })
  if (!sent.sent) {
    console.warn('[provisionAlumnoInvite] mail fallback no enviado; link:', inviteUrl)
  }
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

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: nombre ? { nombre } : undefined,
  })

  let invitedUserId = inviteData.user?.id ?? null

  if (inviteError) {
    const msg = inviteError.message?.toLowerCase() ?? ''
    const alreadyRegistered =
      msg.includes('already') || msg.includes('registered') || msg.includes('exists')

    if (!alreadyRegistered) {
      console.error('[provisionAlumnoInvite]', inviteError)
      return { ok: false, error: inviteError.message ?? 'no se pudo enviar la invitación' }
    }

    console.info('[provisionAlumnoInvite] usuario ya existe, generando link de invitación', email)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo, data: nombre ? { nombre } : undefined },
    })

    if (linkError || !linkData) {
      console.error('[provisionAlumnoInvite] generateLink', linkError)
      return { ok: false, error: 'no se pudo generar el link de invitación' }
    }

    invitedUserId = linkData.user?.id ?? invitedUserId
    const actionLink = readInviteActionLink(linkData)
    if (actionLink) {
      await sendInviteLinkFallback(email, actionLink)
    }
  }

  const { data: alumno, error: upsertError } = await admin
    .from('alumnos')
    .upsert(
      {
        user_id: invitedUserId,
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
    return { ok: false, error: 'invitación enviada, pero no se pudo guardar el alumno' }
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
