import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function randomTokenHex(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader || !secret) return false
  const digest = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
  const a = Buffer.from(digest, 'utf8')
  const b = Buffer.from(hmacHeader, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
