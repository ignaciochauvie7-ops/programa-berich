import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { appPublicOrigin } from '../_lib/appOrigin.js'
import { compactQuizJson, type QuizSnapshotInput } from '../_lib/coach/quizProfile.js'
import type { CoachGoal } from '../_lib/coach/types.js'
import { dodoCheckoutUserMessage } from '../_lib/dodoCheckoutErrors.js'
import { dodoApiBaseUrl, dodoApiKey, dodoProductId } from '../_lib/dodoConfig.js'

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

  const apiKey = dodoApiKey()
  const productId = dodoProductId()
  if (!apiKey || !productId) {
    return json({ error: 'Dodo Payments no configurado en el servidor' }, 500)
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
  const returnUrl = origin ? `${origin}/login?checkout=success` : undefined

  const payload: Record<string, unknown> = {
    product_cart: [{ product_id: productId, quantity: 1 }],
  }

  if (returnUrl) payload.return_url = returnUrl

  const metadata: Record<string, string> = { source: 'quiz' }
  if (variant) metadata.quiz_variant = variant
  if (isValidQuiz(body.quiz)) {
    metadata.quiz_json = compactQuizJson(body.quiz)
    if (!metadata.quiz_variant) metadata.quiz_variant = body.quiz.variant
  }
  if (Object.keys(metadata).length > 0) {
    payload.metadata = metadata
  }

  const res = await fetch(`${dodoApiBaseUrl()}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: { checkout_url?: string | null; session_id?: string; error?: string; message?: string }
  try {
    data = (await res.json()) as typeof data
  } catch {
    return json({ error: 'respuesta inválida de Dodo Payments' }, 502)
  }

  if (!res.ok) {
    console.error('[dodo checkout]', res.status, data)
    const apiError = data.message ?? data.error ?? 'No se pudo crear el checkout'
    const message = dodoCheckoutUserMessage(res.status, apiError)
    return json({ error: message }, res.status >= 500 ? 502 : 400)
  }

  const checkoutUrl = data.checkout_url
  if (!checkoutUrl) {
    return json({ error: 'Dodo no devolvió checkout_url' }, 502)
  }

  return json({ checkout_url: checkoutUrl, session_id: data.session_id ?? null })
}

export default webHandler(handler)
