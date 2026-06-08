import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin.js'

const COMMISSION_RATE = 0.30
const DEFAULT_SALE_USD = 49

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const body = await request.json() as {
    affiliateEmail?: string
    buyerEmail?: string
    saleAmountUsd?: number
  }

  const affiliateEmail = normalizeEmail(body.affiliateEmail ?? '')
  const buyerEmail = normalizeEmail(body.buyerEmail ?? '')
  const saleAmount = Number(body.saleAmountUsd ?? DEFAULT_SALE_USD)

  if (!affiliateEmail || !buyerEmail) {
    return json({ error: 'affiliateEmail y buyerEmail son requeridos' }, 400)
  }

  const { data: aff, error: affErr } = await admin
    .from('affiliates')
    .select('id')
    .eq('email', affiliateEmail)
    .maybeSingle()

  if (affErr) return json({ error: 'db error' }, 500)
  if (!aff) return json({ error: 'Afiliado no encontrado' }, 404)

  const commissionUsd = Math.round(saleAmount * COMMISSION_RATE * 100) / 100

  const { error: insertErr } = await admin.from('affiliate_sales').insert({
    affiliate_id: aff.id,
    buyer_email: buyerEmail,
    sale_amount_usd: saleAmount,
    commission_usd: commissionUsd,
  })

  if (insertErr) return json({ error: 'db error' }, 500)

  return json({ ok: true, commissionUsd })
}

export default webHandler(handler)
