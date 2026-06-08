function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function readNameFromObject(obj: Record<string, unknown>): string | null {
  const name = readString(obj.name)
  if (name) return name

  const first = readString(obj.first_name) ?? readString(obj.firstName)
  const last = readString(obj.last_name) ?? readString(obj.lastName)
  if (first && last) return `${first} ${last}`
  if (first) return first
  if (last) return last

  return null
}

export function readPaymentCustomerEmail(data: Record<string, unknown>): string | null {
  const direct = readString(data.email)
  if (direct?.includes('@')) return direct

  for (const key of ['customer', 'billing', 'buyer'] as const) {
    const block = data[key]
    if (block && typeof block === 'object' && block !== null) {
      const email = readString((block as { email?: unknown }).email)
      if (email?.includes('@')) return email
    }
  }

  const user = data.user
  if (user && typeof user === 'object' && user !== null) {
    const email = readString((user as { email?: unknown }).email)
    if (email?.includes('@')) return email
  }

  return null
}

export function readPaymentCustomerName(data: Record<string, unknown>): string | null {
  for (const key of ['customer', 'billing', 'buyer'] as const) {
    const block = data[key]
    if (block && typeof block === 'object' && block !== null) {
      const name = readNameFromObject(block as Record<string, unknown>)
      if (name) return name
    }
  }

  return readString(data.customer_name) ?? readString(data.name)
}

export function readPaymentMetadata(data: Record<string, unknown>): unknown {
  if (data.metadata) return data.metadata

  const checkout = data.checkout
  if (checkout && typeof checkout === 'object' && checkout !== null) {
    return (checkout as { metadata?: unknown }).metadata
  }

  return null
}

export function readMetadataVariant(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || metadata === null) return null
  const variant = (metadata as { quiz_variant?: unknown }).quiz_variant
  return typeof variant === 'string' && variant ? variant : null
}

export function readPaymentId(data: Record<string, unknown>): string | null {
  for (const key of ['id', 'order_id', 'payment_id'] as const) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function readCurrency(data: Record<string, unknown>): string {
  const direct = data.currency
  if (typeof direct === 'string' && direct.trim()) return direct.trim().toUpperCase()
  return 'USD'
}

export function readAmountValue(data: Record<string, unknown>): number {
  const amountKeys = ['amount', 'total_amount', 'amount_total', 'total', 'paid_amount'] as const

  for (const key of amountKeys) {
    const value = data[key]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
    if (typeof value === 'string') {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
  }

  return 4900
}
