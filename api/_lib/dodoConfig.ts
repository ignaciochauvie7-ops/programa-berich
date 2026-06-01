export type DodoEnvironment = 'test' | 'live'

export function dodoEnvironment(): DodoEnvironment {
  const raw = (process.env.DODO_PAYMENTS_ENVIRONMENT ?? 'test').trim().toLowerCase()
  return raw === 'live' ? 'live' : 'test'
}

export function dodoApiBaseUrl(): string {
  return dodoEnvironment() === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com'
}

export function dodoApiKey(): string | null {
  const key = process.env.DODO_PAYMENTS_API_KEY?.trim()
  return key || null
}

export function dodoProductId(): string | null {
  const id = process.env.DODO_PRODUCT_ID?.trim()
  return id || null
}

export function dodoWebhookSecret(): string | null {
  const secret = process.env.DODO_WEBHOOK_SECRET?.trim() ?? process.env.DODO_WEBHOOK_KEY?.trim()
  return secret || null
}
