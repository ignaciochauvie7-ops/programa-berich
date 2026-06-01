import { provisionAlumnoInvite } from './provisionAlumno.js'
import { getSupabaseAdmin, normalizeEmail } from './supabaseAdmin.js'

export type PurchaseSource = 'dodo'

export async function grantProgramAccess(params: {
  email: string
  source: PurchaseSource
  quizVariant?: string | null
  nombre?: string | null
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const email = normalizeEmail(params.email)
  if (!email.includes('@')) {
    return { ok: false, error: 'invalid email', status: 400 }
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return { ok: false, error: 'server misconfigured: supabase', status: 500 }
  }

  await admin.from('affiliates').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

  const result = await provisionAlumnoInvite(admin, email, {
    source: params.source,
    productSlug: process.env.PRODUCT_SLUG ?? 'berich-completo',
    nombre: params.nombre?.trim() || undefined,
    activo: true,
  })

  if (!result.ok) {
    return { ok: false, error: result.error, status: 500 }
  }

  if (params.quizVariant) {
    console.info('[grantProgramAccess] quiz_variant', params.quizVariant, email)
  }

  return { ok: true }
}
