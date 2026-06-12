import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { fulfillPolarPurchase, polarCheckoutIsPaid } from '../_lib/fulfillPolarPurchase.js'
import { fetchPolarCheckout } from '../_lib/polarCheckoutApi.js'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin.js'
import { provisionAlumnoInvite } from '../_lib/provisionAlumno.js'

type Body = {
  checkout_id?: string
  email?: string
}

async function resendInviteForPaidEmail(emailRaw: string): Promise<Response> {
  const email = normalizeEmail(emailRaw)
  if (!email.includes('@')) {
    return json({ error: 'email inválido' }, 400)
  }

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const productSlug = process.env.PRODUCT_SLUG ?? 'berich-completo'

  const { data: entitlement } = await admin
    .from('entitlements')
    .select('email')
    .eq('email', email)
    .eq('product_slug', productSlug)
    .maybeSingle()

  if (!entitlement) {
    return json(
      {
        error:
          'No encontramos una compra con ese mail todavía. Esperá unos minutos o contactanos con el comprobante.',
      },
      404,
    )
  }

  const result = await provisionAlumnoInvite(admin, email, {
    source: 'polar',
    productSlug,
    activo: false,
  })

  if (result.ok === false) {
    return json({ error: result.error }, 500)
  }

  return json({
    ok: true,
    email,
    mail_sent: result.mailSent,
    alumno: result.alumno,
    resent: true,
  })
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const checkoutId = String(body.checkout_id ?? '').trim()
  const emailOnly = String(body.email ?? '').trim()

  if (checkoutId) {
    const fetched = await fetchPolarCheckout(checkoutId)
    if (fetched.ok === false) {
      return json({ error: fetched.error }, fetched.status)
    }

    if (!polarCheckoutIsPaid(fetched.data)) {
      return json({ error: 'El pago todavía no figura como confirmado. Esperá unos segundos y recargá.' }, 409)
    }

    const result = await fulfillPolarPurchase(fetched.data, `confirm:${checkoutId}`)
    if (result.ok === false) {
      return json({ error: result.error }, result.status)
    }

    return json({
      ok: true,
      email: result.email,
      mail_sent: result.mailSent,
      checkout_id: checkoutId,
    })
  }

  if (emailOnly) {
    return resendInviteForPaidEmail(emailOnly)
  }

  return json({ error: 'Falta checkout_id o email' }, 400)
}

export default webHandler(handler)
