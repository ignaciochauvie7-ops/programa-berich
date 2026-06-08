import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function randomTokenHex(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

/** Standard Webhooks (Polar, etc.) signature verification. */
export function verifyStandardWebhook(
  rawBody: string,
  headers: { id: string; timestamp: string; signature: string },
  secret: string,
  toleranceSec = 300,
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature || !secret) return false

  const timestamp = Number.parseInt(headers.timestamp, 10)
  if (!Number.isFinite(timestamp)) return false
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSec) return false

  let key: Buffer
  if (secret.startsWith('polar_whs_')) {
    key = Buffer.from(secret.trim(), 'utf8')
  } else {
    const secretPart = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
    try {
      key = Buffer.from(secretPart, 'base64')
    } catch {
      return false
    }
  }

  const signed = `${headers.id}.${headers.timestamp}.${rawBody}`

  for (const part of headers.signature.split(' ')) {
    const comma = part.indexOf(',')
    if (comma === -1) continue
    const version = part.slice(0, comma)
    const sig = part.slice(comma + 1)
    if (version !== 'v1' || !sig) continue

    const expected = createHmac('sha256', key).update(signed, 'utf8').digest('base64')
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(sig, 'utf8')
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }

  return false
}
