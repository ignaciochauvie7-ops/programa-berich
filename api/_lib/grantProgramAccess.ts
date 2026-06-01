import { randomTokenHex, sha256Hex } from './crypto'
import { sendProgramInviteEmail } from './email'
import { appPublicOrigin } from './appOrigin'
import { getSupabaseAdmin, normalizeEmail } from './supabaseAdmin'

export type PurchaseSource = 'dodo'

export async function grantProgramAccess(params: {
  email: string
  source: PurchaseSource
  quizVariant?: string | null
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const email = normalizeEmail(params.email)
  if (!email.includes('@')) {
    return { ok: false, error: 'invalid email', status: 400 }
  }

  const productSlug = (process.env.PRODUCT_SLUG ?? 'berich-completo').trim()
  const admin = getSupabaseAdmin()
  if (!admin) {
    return { ok: false, error: 'server misconfigured: supabase', status: 500 }
  }

  const { error: entErr } = await admin.from('entitlements').upsert(
    { email, product_slug: productSlug, source: params.source },
    { onConflict: 'email,product_slug' },
  )

  if (entErr) {
    console.error('[grantProgramAccess] entitlements', entErr)
    return { ok: false, error: 'db entitlements', status: 500 }
  }

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
    console.error('[grantProgramAccess] invite_tokens', invErr)
    return { ok: false, error: 'db invite', status: 500 }
  }

  const origin = appPublicOrigin()
  if (!origin) {
    console.warn('[grantProgramAccess] APP_PUBLIC_URL / VERCEL_URL ausente; mail sin link absoluto')
  }

  const inviteUrl = `${origin}/crear-cuenta?token=${encodeURIComponent(token)}`
  await sendProgramInviteEmail({
    to: email,
    inviteUrl,
    productLabel: 'Programa Berich',
  })

  if (params.quizVariant) {
    console.info('[grantProgramAccess] quiz_variant', params.quizVariant, email)
  }

  return { ok: true }
}
