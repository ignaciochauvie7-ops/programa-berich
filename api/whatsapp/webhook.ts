import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findProfileByPhone } from '../_lib/coach/alumnoCoach.js'
import { handleInboundText } from '../_lib/coach/proactive.js'
import { normalizePhoneE164 } from '../_lib/coach/phone.js'
import { verifyWebhookChallenge, verifyWebhookSignature } from '../_lib/whatsapp/verifyWebhook.js'

type WhatsAppWebhook = {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          id?: string
          from?: string
          type?: string
          text?: { body?: string }
        }[]
        statuses?: unknown[]
      }
    }[]
  }[]
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)

  if (request.method === 'GET') {
    const challenge = verifyWebhookChallenge(url)
    return challenge ?? new Response('Forbidden', { status: 403 })
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: WhatsAppWebhook
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhook
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const messages =
    payload.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []) ?? []

  for (const message of messages) {
    if (message.type !== 'text' || !message.text?.body || !message.from) continue

    const phone = normalizePhoneE164(`+${message.from}`)
    if (!phone) continue

    const profile = await findProfileByPhone(admin, phone)
    if (!profile) continue

    try {
      await handleInboundText(admin, profile, message.text.body.trim(), message.id ?? null)
    } catch (err) {
      console.error('[whatsapp webhook] handle message', err)
    }
  }

  return json({ ok: true })
}

export default webHandler(handler)
