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
}): Promise<{ ok: true; alumnoId: string; mailSent: boolean } | { ok: false; error: string; status: number }> {
  const email = normalizeEmail(params.email)
  if (!email.includes('@')) {
    return { ok: false, error: 'invalid email', status: 400 }
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return { ok: false, error: 'server misconfigured: supabase', status: 500 }
  }

  const productSlug = process.env.PRODUCT_SLUG ?? 'berich-completo'
  const { data: existingEntitlement } = await admin
    .from('entitlements')
    .select('email')
    .eq('email', email)
    .eq('product_slug', productSlug)
    .eq('source', params.source)
    .maybeSingle()

  const provisionOptions = {
    source: params.source,
    productSlug,
    nombre: params.nombre?.trim() || undefined,
    activo: false as const,
  }

  if (existingEntitlement) {
    const { data: existingAlumno } = await admin
      .from('alumnos')
      .select('id, activo')
      .eq('email', email)
      .maybeSingle()

    if (existingAlumno?.id) {
      console.info('[grantProgramAccess] ya provisionado', email, params.source, existingAlumno.activo ? 'activo' : 'pendiente')

      if (!existingAlumno.activo) {
        const retry = await provisionAlumnoInvite(admin, email, provisionOptions)
        if (retry.ok === false) {
          return { ok: false, error: retry.error, status: 500 }
        }
        if (!retry.mailSent) {
          console.warn('[grantProgramAccess] reintento sin mail', email)
        }
        if (params.quizSnapshot) {
          const saved = await saveQuizProfileForAlumno(admin, retry.alumno.id, params.quizSnapshot)
          if (saved.ok === false) {
            console.error('[grantProgramAccess] quiz profile', saved.error, email)
          }
        }
        return { ok: true, alumnoId: retry.alumno.id, mailSent: retry.mailSent }
      }

      if (params.quizSnapshot) {
        const saved = await saveQuizProfileForAlumno(admin, existingAlumno.id, params.quizSnapshot)
        if (saved.ok === false) {
          console.error('[grantProgramAccess] quiz profile', saved.error, email)
        }
      }

      return { ok: true, alumnoId: existingAlumno.id, mailSent: false }
    }
  }

  const result = await provisionAlumnoInvite(admin, email, provisionOptions)

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

  return { ok: true, alumnoId: result.alumno.id, mailSent: result.mailSent }
}
