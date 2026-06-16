export type PolarEnvironment = 'sandbox' | 'production'

export function polarEnvironment(): PolarEnvironment {
  const raw = (process.env.POLAR_ENVIRONMENT ?? 'production').trim().toLowerCase()
  if (raw === 'sandbox' || raw === 'test') return 'sandbox'
  return 'production'
}

export function polarApiBaseUrl(): string {
  return polarEnvironment() === 'sandbox' ? 'https://sandbox-api.polar.sh/v1' : 'https://api.polar.sh/v1'
}

export function polarAccessToken(): string | null {
  const token = process.env.POLAR_ACCESS_TOKEN?.trim()
  return token || null
}

export function polarProductId(): string | null {
  const id = process.env.POLAR_PRODUCT_ID?.trim()
  return id || null
}

export function polarSubscriptionProductId(): string | null {
  const id = process.env.POLAR_SUBSCRIPTION_PRODUCT_ID?.trim()
  return id || null
}

export function polarWebhookSecret(): string | null {
  const secret = process.env.POLAR_WEBHOOK_SECRET?.trim()
  return secret || null
}
