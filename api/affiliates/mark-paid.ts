import { json } from '../_lib/json'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const body = await request.json() as { affiliateEmail?: string }
  const email = normalizeEmail(body.affiliateEmail ?? '')
  if (!email) return json({ error: 'affiliateEmail requerido' }, 400)

  const { data: aff } = await admin
    .from('affiliates')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!aff) return json({ error: 'Afiliado no encontrado' }, 404)

  const { error } = await admin
    .from('affiliate_sales')
    .update({ paid_at: new Date().toISOString() })
    .eq('affiliate_id', aff.id)
    .is('paid_at', null)

  if (error) return json({ error: 'db error' }, 500)

  return json({ ok: true })
}
