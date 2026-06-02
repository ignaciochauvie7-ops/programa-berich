type SendResult = { ok: true; messageId: string | null } | { ok: false; error: string }

function whatsappConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  if (!token || !phoneNumberId) return null
  return { token, phoneNumberId }
}

async function postWhatsApp(body: Record<string, unknown>): Promise<SendResult> {
  const config = whatsappConfig()
  if (!config) return { ok: false, error: 'whatsapp not configured' }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = (await res.json()) as {
      messages?: { id?: string }[]
      error?: { message?: string }
    }

    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `whatsapp ${res.status}` }
    }

    return { ok: true, messageId: data.messages?.[0]?.id ?? null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'whatsapp request failed'
    return { ok: false, error: message }
  }
}

export function isWhatsAppConfigured(): boolean {
  return whatsappConfig() !== null
}

export async function sendWhatsAppText(toE164: string, text: string): Promise<SendResult> {
  return postWhatsApp({
    messaging_product: 'whatsapp',
    to: toE164.replace(/^\+/, ''),
    type: 'text',
    text: { body: text },
  })
}

export async function sendWhatsAppTemplate(
  toE164: string,
  templateName: string,
  languageCode = 'es',
  bodyParams: string[] = [],
): Promise<SendResult> {
  return postWhatsApp({
    messaging_product: 'whatsapp',
    to: toE164.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components:
        bodyParams.length > 0
          ? [
              {
                type: 'body',
                parameters: bodyParams.map((text) => ({ type: 'text', text })),
              },
            ]
          : undefined,
    },
  })
}
