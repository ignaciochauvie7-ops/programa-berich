import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { appPublicOrigin } from '../_lib/appOrigin.js'
import { readClientIp } from '../_lib/clientIp.js'
import { compactQuizJson, type QuizSnapshotInput } from '../_lib/coach/quizProfile.js'
import type { CoachGoal } from '../_lib/coach/types.js'
import { polarCheckoutUserMessage } from '../_lib/polarCheckoutErrors.js'
import { polarAccessToken, polarApiBaseUrl, polarEnvironment, polarProductId } from '../_lib/polarConfig.js'

type Body = {
  variant?: string
  quiz?: QuizSnapshotInput
}

const GOALS: CoachGoal[] = ['Ganar músculo', 'Perder grasa', 'Recomposición corporal']

function isValidQuiz(quiz: QuizSnapshotInput | undefined): quiz is QuizSnapshotInput {
  if (!quiz) return false
  return (
    typeof quiz.variant === 'string' &&
    (quiz.sex === 'hombre' || quiz.sex === 'mujer') &&
    typeof quiz.age_range === 'string' &&
    Number.isFinite(quiz.height_cm) &&
    Number.isFinite(quiz.weight_kg) &&
    GOALS.includes(quiz.goal) &&
    typeof quiz.impediment === 'string' &&
    (quiz.impediment_path === 'musculo' || quiz.impediment_path === 'grasa-recomp')
  )
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const accessToken = polarAccessToken()
  const productId = polarProductId()
  if (!accessToken || !productId) {
    return json({ error: 'Polar no configurado en el servidor (POLAR_ACCESS_TOKEN / POLAR_PRODUCT_ID)' }, 500)
  }

  let body: Body = {}
  try {
    const text = await request.text()
    if (text.trim()) body = JSON.parse(text) as Body
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const variant = typeof body.variant === 'string' ? body.variant.trim().slice(0, 32) : ''
  const origin = appPublicOrigin()
  const successUrl = origin ? `${origin}/login?checkout=success` : undefined

  const metadata: Record<string, string> = { source: 'quiz' }
  if (variant) metadata.quiz_variant = variant
  if (isValidQuiz(body.quiz)) {
    metadata.quiz_json = compactQuizJson(body.quiz)
    if (!metadata.quiz_variant) metadata.quiz_variant = body.quiz.variant
  }

  const payload: Record<string, unknown> = {
    products: [productId],
    metadata,
  }

  if (successUrl) payload.success_url = successUrl

  const clientIp = readClientIp(request)
  if (clientIp) payload.customer_ip_address = clientIp

  const res = await fetch(`${polarApiBaseUrl()}/checkouts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: { url?: string | null; id?: string; detail?: unknown; error?: string }
  try {
    data = (await res.json()) as typeof data
  } catch {
    return json({ error: 'respuesta inválida de Polar' }, 502)
  }

  if (!res.ok) {
    console.error('[polar checkout]', polarEnvironment(), res.status, data)
    const detail =
      typeof data.detail === 'string'
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map((d) => (typeof d === 'object' && d && 'msg' in d ? String(d.msg) : '')).filter(Boolean).join('; ')
          : data.error
    const message = polarCheckoutUserMessage(res.status, detail ?? 'No se pudo crear el checkout')
    return json({ error: message }, res.status >= 500 ? 502 : 400)
  }

  const checkoutUrl = data.url
  if (!checkoutUrl) {
    return json({ error: 'Polar no devolvió url de checkout' }, 502)
  }

  return json({ checkout_url: checkoutUrl, session_id: data.id ?? null })
}

export default webHandler(handler)
