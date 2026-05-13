import { json } from '../_lib/json'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin'

const COMMISSION_RATE = 0.30

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'PATCH') {
    return new Response('Method not allowed', { status: 405 })
  }

  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'unauthorized' }, 401)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user?.email) return json({ error: 'unauthorized' }, 401)

  const email = normalizeEmail(user.email)

  if (request.method === 'GET') {
    const { data: aff, error: affErr } = await admin
      .from('affiliates')
      .select('id, email, code, active, created_at')
      .eq('email', email)
      .maybeSingle()

    if (affErr) return json({ error: 'db error' }, 500)
    if (!aff) return json({ error: 'not found' }, 404)

    const { data: sales } = await admin
      .from('affiliate_sales')
      .select('sale_amount_usd, commission_usd, paid_at')
      .eq('affiliate_id', aff.id)

    const totalSales = sales?.length ?? 0
    const totalUsd = sales?.reduce((s, r) => s + Number(r.sale_amount_usd), 0) ?? 0
    const totalCommission = sales?.reduce((s, r) => s + Number(r.commission_usd), 0) ?? 0
    const paidCommission = sales?.filter(r => r.paid_at).reduce((s, r) => s + Number(r.commission_usd), 0) ?? 0

    const origin = (process.env.APP_PUBLIC_URL ?? '').replace(/\/$/, '')
    const ref = aff.code ?? aff.id
    const link = `${origin}/f/entrenamiento?ref=${encodeURIComponent(ref)}`

    return json({
      ...aff,
      link,
      stats: {
        totalSales,
        totalUsd,
        totalCommission,
        paidCommission,
        pendingCommission: totalCommission - paidCommission,
      },
    })
  }

  // PATCH — set custom code
  const body = await request.json() as { code?: string }
  const code = (body.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')

  if (!code || code.length < 3 || code.length > 20) {
    return json({ error: 'Código inválido. Usá entre 3 y 20 caracteres alfanuméricos.' }, 400)
  }

  const { data: taken } = await admin
    .from('affiliates')
    .select('email')
    .eq('code', code)
    .maybeSingle()

  if (taken && normalizeEmail(taken.email) !== email) {
    return json({ error: 'Ese código ya está en uso. Elegí otro.' }, 409)
  }

  const { data: updated, error: upErr } = await admin
    .from('affiliates')
    .update({ code })
    .eq('email', email)
    .select('id, email, code, active, created_at')
    .maybeSingle()

  if (upErr) return json({ error: 'db error' }, 500)

  const origin = (process.env.APP_PUBLIC_URL ?? '').replace(/\/$/, '')
  const link = `${origin}/f/entrenamiento?ref=${encodeURIComponent(code)}`

  return json({ ...updated, link, commissionRate: COMMISSION_RATE })
}
