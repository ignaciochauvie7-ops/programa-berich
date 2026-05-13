import { json } from '../_lib/json'
import { randomTokenHex, sha256Hex, verifyShopifyWebhookHmac } from '../_lib/crypto'
import { sendProgramInviteEmail } from '../_lib/email'
import { getSupabaseAdmin, normalizeEmail } from '../_lib/supabaseAdmin'

function appPublicOrigin(): string {
  const explicit = process.env.APP_PUBLIC_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return ''
}

function readOrderEmail(order: Record<string, unknown>): string | null {
  const direct = order.email
  if (typeof direct === 'string' && direct.includes('@')) return direct
  const customer = order.customer
  if (customer && typeof customer === 'object' && customer !== null && 'email' in customer) {
    const ce = (customer as { email?: unknown }).email
    if (typeof ce === 'string' && ce.includes('@')) return ce
  }
  const contact = order.contact_email
  if (typeof contact === 'string' && contact.includes('@')) return contact
  return null
}

/**
 * Webhook Shopify: tema recomendado `orders/paid` (orden pagada).
 * Configurá el secreto del webhook en SHOPIFY_WEBHOOK_SECRET.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  const hmac = request.headers.get('x-shopify-hmac-sha256')
  const rawBody = await request.text()

  if (!secret || !verifyShopifyWebhookHmac(rawBody, hmac, secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let order: Record<string, unknown>
  try {
    order = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const emailRaw = readOrderEmail(order)
  if (!emailRaw) {
    return json({ error: 'order without email' }, 400)
  }

  const email = normalizeEmail(emailRaw)
  const productSlug = (process.env.PRODUCT_SLUG ?? 'berich-completo').trim()
  const admin = getSupabaseAdmin()
  if (!admin) {
    return json({ error: 'server misconfigured: supabase' }, 500)
  }

  const { error: entErr } = await admin.from('entitlements').upsert(
    { email, product_slug: productSlug, source: 'shopify' },
    { onConflict: 'email,product_slug' },
  )

  if (entErr) {
    console.error('[shopify webhook] entitlements', entErr)
    return json({ error: 'db entitlements' }, 500)
  }

  // Auto-create affiliate record for the buyer (ignored if already exists)
  await admin.from('affiliates').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

  const token = randomTokenHex(32)
  const tokenHash = sha256Hex(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error: invErr } = await admin.from('invite_tokens').insert({
    token_hash: tokenHash,
    email,
    product_slug: productSlug,
    expires_at: expiresAt,
  })

  if (invErr) {
    console.error('[shopify webhook] invite_tokens', invErr)
    return json({ error: 'db invite' }, 500)
  }

  const origin = appPublicOrigin()
  if (!origin) {
    console.warn('[shopify webhook] APP_PUBLIC_URL / VERCEL_URL ausente; mail sin link absoluto')
  }

  const inviteUrl = `${origin}/crear-cuenta?token=${encodeURIComponent(token)}`
  await sendProgramInviteEmail({
    to: email,
    inviteUrl,
    productLabel: 'Programa Berich',
  })

  return json({ ok: true })
}
