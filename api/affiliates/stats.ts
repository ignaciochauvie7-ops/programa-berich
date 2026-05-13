import { json } from '../_lib/json'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin'

type Period = 'today' | 'week' | 'month' | 'all'

function periodStart(period: Period): string | null {
  const now = new Date()
  if (period === 'today') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
  return null
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const url = new URL(request.url)
  const period = (url.searchParams.get('period') ?? 'all') as Period
  const since = periodStart(period)

  const { data: affiliates, error: affErr } = await admin
    .from('affiliates')
    .select('id, email, code, active, created_at')
    .order('created_at', { ascending: false })

  if (affErr) return json({ error: 'db error' }, 500)

  let salesQuery = admin
    .from('affiliate_sales')
    .select('id, affiliate_id, sale_amount_usd, commission_usd, paid_at, created_at')

  if (since) salesQuery = salesQuery.gte('created_at', since)

  const { data: sales, error: salesErr } = await salesQuery
  if (salesErr) return json({ error: 'db error' }, 500)

  const origin = (process.env.APP_PUBLIC_URL ?? '').replace(/\/$/, '')

  const rows = (affiliates ?? []).map(aff => {
    const mySales = (sales ?? []).filter(s => s.affiliate_id === aff.id)
    const salesCount = mySales.length
    const totalUsd = mySales.reduce((s, r) => s + Number(r.sale_amount_usd), 0)
    const commissionUsd = mySales.reduce((s, r) => s + Number(r.commission_usd), 0)
    const paidUsd = mySales.filter(r => r.paid_at).reduce((s, r) => s + Number(r.commission_usd), 0)
    const ref = aff.code ?? aff.id
    const link = `${origin}/f/entrenamiento?ref=${encodeURIComponent(ref)}`

    return {
      id: aff.id,
      email: aff.email,
      code: aff.code as string | null,
      link,
      active: aff.active as boolean,
      salesCount,
      totalUsd,
      commissionUsd,
      paidUsd,
      pendingUsd: commissionUsd - paidUsd,
    }
  })

  const totals = {
    salesCount: rows.reduce((s, r) => s + r.salesCount, 0),
    totalUsd: rows.reduce((s, r) => s + r.totalUsd, 0),
    commissionUsd: rows.reduce((s, r) => s + r.commissionUsd, 0),
    pendingUsd: rows.reduce((s, r) => s + r.pendingUsd, 0),
  }

  return json({ rows, totals, period })
}
