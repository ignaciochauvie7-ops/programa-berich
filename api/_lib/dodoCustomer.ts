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

/** Nombre completo del checkout Dodo (customer / billing / buyer). */
export function readPaymentCustomerName(data: Record<string, unknown>): string | null {
  for (const key of ['customer', 'billing', 'buyer'] as const) {
    const block = data[key]
    if (block && typeof block === 'object' && block !== null) {
      const name = readNameFromObject(block as Record<string, unknown>)
      if (name) return name
    }
  }

  const payment = data.payment
  if (payment && typeof payment === 'object' && payment !== null) {
    return readPaymentCustomerName(payment as Record<string, unknown>)
  }

  return readString(data.customer_name) ?? readString(data.name)
}
