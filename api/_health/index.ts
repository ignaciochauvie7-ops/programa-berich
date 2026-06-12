import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getActivationOrigin } from '../_lib/auth.js'
import { appPublicOrigin } from '../_lib/appOrigin.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'

function envOk(key: string): boolean {
  return Boolean(process.env[key]?.trim())
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const admin = getSupabaseAdmin()
  let supabaseReachable = false
  if (admin) {
    const { error } = await admin.from('alumnos').select('id').limit(1)
    supabaseReachable = !error
  }

  const checks = {
    supabase_url: envOk('SUPABASE_URL'),
    supabase_service_role: envOk('SUPABASE_SERVICE_ROLE_KEY'),
    supabase_reachable: supabaseReachable,
    resend_api_key: envOk('RESEND_API_KEY'),
    resend_from: process.env.RESEND_FROM?.trim() || 'Programa Berich <hola@programaberich.fit>',
    polar_token: envOk('POLAR_ACCESS_TOKEN'),
    polar_product: envOk('POLAR_PRODUCT_ID'),
    polar_webhook_secret: envOk('POLAR_WEBHOOK_SECRET'),
    polar_environment: process.env.POLAR_ENVIRONMENT?.trim() || 'production',
    product_slug: process.env.PRODUCT_SLUG?.trim() || 'berich-completo',
    admin_emails: envOk('ADMIN_EMAILS'),
    app_public_url: appPublicOrigin() || null,
    activation_public_url: getActivationOrigin(),
    vite_supabase_url: envOk('VITE_SUPABASE_URL'),
    vite_supabase_anon: envOk('VITE_SUPABASE_ANON_KEY'),
  }

  const requiredForPurchaseFlow = [
    checks.supabase_url,
    checks.supabase_service_role,
    checks.supabase_reachable,
    checks.resend_api_key,
    checks.polar_token,
    checks.polar_product,
    checks.polar_webhook_secret,
    checks.app_public_url?.startsWith('https://'),
    checks.activation_public_url?.startsWith('https://'),
  ]

  const resendFrom = checks.resend_from.toLowerCase()
  const resendUsesSandboxDomain = resendFrom.includes('@resend.dev')

  const purchaseFlowReady =
    requiredForPurchaseFlow.every(Boolean) && !resendUsesSandboxDomain

  const hints: string[] = []
  if (resendUsesSandboxDomain) {
    hints.push(
      'RESEND_FROM en Vercel usa onboarding@resend.dev (solo permite enviar a tu mail de Resend). Cambiá a: Programa Berich <hola@programaberich.fit> y redeploy.',
    )
  }
  if (!purchaseFlowReady && hints.length === 0) {
    hints.push(
      'Faltan variables en Vercel Production o el deploy no las cargó. Redeploy después de guardar.',
      'Polar webhook debe apuntar a https://programaberich.fit/api/polar/webhook',
      'Supabase → Redirect URLs debe incluir https://programaberich.fit/activar-cuenta',
    )
  }

  return json({
    ok: purchaseFlowReady,
    purchase_flow_ready: purchaseFlowReady,
    checks: { ...checks, resend_sandbox_domain: resendUsesSandboxDomain },
    hints,
  })
}

export default webHandler(handler)
