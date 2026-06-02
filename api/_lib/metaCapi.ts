import { createHash } from 'node:crypto'

type MetaPurchaseParams = {
  email: string
  eventId: string
  value: number
  currency: string
  eventSourceUrl?: string
}

function normalizeCurrency(currency: string): string {
  const clean = currency.trim().toUpperCase()
  return clean.length === 3 ? clean : 'USD'
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export async function sendMetaPurchaseEvent(params: MetaPurchaseParams): Promise<{ ok: true } | { ok: false; error: string }> {
  const pixelId = process.env.META_PIXEL_ID?.trim()
  const accessToken = process.env.META_ACCESS_TOKEN?.trim()

  if (!pixelId || !accessToken) {
    return { ok: false, error: 'meta env missing' }
  }

  const email = params.email.trim().toLowerCase()
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'invalid email' }
  }

  const event = {
    event_name: 'Purchase',
    event_time: toUnixSeconds(new Date()),
    action_source: 'website',
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl,
    user_data: {
      em: [sha256(email)],
    },
    custom_data: {
      value: Number(params.value.toFixed(2)),
      currency: normalizeCurrency(params.currency),
    },
  }

  const body: Record<string, unknown> = {
    data: [event],
    access_token: accessToken,
  }

  const testCode = process.env.META_TEST_EVENT_CODE?.trim()
  if (testCode) body.test_event_code = testCode

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return { ok: false, error: `meta api ${response.status}: ${text.slice(0, 300)}` }
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: `meta request failed: ${message}` }
  }
}
