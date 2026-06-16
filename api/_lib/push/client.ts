import webpush from 'web-push'
import type { PushNotificationPayload, PushSubscriptionPayload } from './types.js'

function vapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:hola@programaberich.fit'
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey, subject }
}

export function isPushConfigured(): boolean {
  return vapidConfig() !== null
}

export function getVapidPublicKey(): string | null {
  return vapidConfig()?.publicKey ?? null
}

export async function sendPushNotification(
  subscription: PushSubscriptionPayload,
  payload: PushNotificationPayload,
): Promise<{ ok: true } | { ok: false; error: string; expired?: boolean }> {
  const config = vapidConfig()
  if (!config) return { ok: false, error: 'push not configured' }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 * 24 })
    return { ok: true }
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    const message = err instanceof Error ? err.message : 'push send failed'
    return { ok: false, error: message, expired: status === 410 || status === 404 }
  }
}
