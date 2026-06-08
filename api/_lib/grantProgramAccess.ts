import { provisionAlumnoInvite } from './provisionAlumno.js'
import { saveQuizProfileForAlumno, type QuizSnapshotInput } from './coach/quizProfile.js'
import { getSupabaseAdmin, normalizeEmail } from './supabaseAdmin.js'

export type PurchaseSource = 'polar' | 'dodo'

export async function grantProgramAccess(params: {
  email: string
  source: PurchaseSource
  quizVariant?: string | null
  quizSnapshot?: QuizSnapshotInput | null
  nombre?: string | null
}): Promise<{ ok: true; alumnoId: string } | { ok: false; error: string; status: number }> {
  const email = normalizeEmail(params.email)
  if (!email.includes('@')) {
    return { ok: false, error: 'invalid email', status: 400 }
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return { ok: false, error: 'server misconfigured: supabase', status: 500 }
  }

  await admin.from('affiliates').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

  const productSlug = process.env.PRODUCT_SLUG ?? 'berich-completo'
  const { data: existingEntitlement } = await admin
    .from('entitlements')
    .select('email')
    .eq('email', email)
    .eq('product_slug', productSlug)
    .eq('source', params.source)
    .maybeSingle()

  if (existingEntitlement) {
    const { data: existingAlumno } = await admin
      .from('alumnos')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    console.info('[grantProgramAccess] ya provisionado', email, params.source)
    if (existingAlumno?.id) {
      return { ok: true, alumnoId: existingAlumno.id }
    }
  }

  const result = await provisionAlumnoInvite(admin, email, {
    source: params.source,
    productSlug,
    nombre: params.nombre?.trim() || undefined,
    activo: false,
  })

  if (result.ok === false) {
    return { ok: false, error: result.error, status: 500 }
  }

  if (!result.mailSent) {
    console.warn('[grantProgramAccess] alumno creado pendiente; mail no enviado', email)
  }

  if (params.quizSnapshot) {
    const saved = await saveQuizProfileForAlumno(admin, result.alumno.id, params.quizSnapshot)
    if (saved.ok === false) {
      console.error('[grantProgramAccess] quiz profile', saved.error, email)
    }
  } else if (params.quizVariant) {
    console.info('[grantProgramAccess] quiz_variant sin snapshot completo', params.quizVariant, email)
  }

  return { ok: true, alumnoId: result.alumno.id }
}
