import { grantProgramAccess } from './grantProgramAccess.js'
import { parseQuizSnapshotFromMetadata } from './coach/quizProfile.js'
import { sendMetaPurchaseEvent } from './metaCapi.js'
import {
  readAmountValue,
  readCurrency,
  readMetadataVariant,
  readPaymentCustomerEmail,
  readPaymentCustomerName,
  readPaymentId,
  readPaymentMetadata,
} from './paymentCustomer.js'

export type FulfillResult =
  | { ok: true; email: string; alumnoId: string; mailSent: boolean; alreadyProvisioned: boolean }
  | { ok: false; error: string; status: number }

function isPaidStatus(status: unknown): boolean {
  if (typeof status !== 'string') return false
  const normalized = status.toLowerCase()
  return ['paid', 'succeeded', 'completed', 'confirmed'].includes(normalized)
}

export function polarCheckoutIsPaid(data: Record<string, unknown>): boolean {
  if (isPaidStatus(data.status)) return true
  const order = data.order
  if (order && typeof order === 'object' && order !== null) {
    return isPaidStatus((order as { status?: unknown }).status)
  }
  return false
}

export async function fulfillPolarPurchase(
  data: Record<string, unknown>,
  eventLabel: string,
): Promise<FulfillResult> {
  const emailRaw = readPaymentCustomerEmail(data)
  if (!emailRaw) {
    console.error('[fulfillPolarPurchase] sin email', eventLabel, data.id)
    return { ok: false, error: 'order without email', status: 400 }
  }

  const metadata = readPaymentMetadata(data)
  const quizVariant = readMetadataVariant(metadata)
  const quizSnapshot = parseQuizSnapshotFromMetadata(metadata)
  if (!quizVariant && !quizSnapshot) {
    console.warn('[fulfillPolarPurchase]', eventLabel, 'sin quiz en metadata', emailRaw)
  }

  const customerName = readPaymentCustomerName(data)

  const result = await grantProgramAccess({
    email: emailRaw,
    source: 'polar',
    quizVariant: quizSnapshot?.variant ?? quizVariant,
    quizSnapshot,
    nombre: customerName,
  })

  if (result.ok === false) {
    console.error('[fulfillPolarPurchase] grantProgramAccess', result.error, emailRaw)
    return { ok: false, error: result.error, status: result.status }
  }

  console.info('[fulfillPolarPurchase] alumno provisionado', emailRaw, eventLabel)

  const paymentId = readPaymentId(data) ?? `order-${Date.now()}`
  const amountValue = readAmountValue(data)
  const amount = amountValue > 999 ? amountValue / 100 : amountValue
  const currency = readCurrency(data)
  const metaResult = await sendMetaPurchaseEvent({
    email: emailRaw,
    eventId: `polar_${paymentId}`,
    value: amount,
    currency,
    eventSourceUrl: process.env.APP_PUBLIC_URL?.trim(),
  })
  if (metaResult.ok === false) {
    console.error('[fulfillPolarPurchase] meta purchase event', metaResult.error)
  }

  return {
    ok: true,
    email: emailRaw,
    alumnoId: result.alumnoId,
    mailSent: result.mailSent,
    alreadyProvisioned: false,
  }
}
