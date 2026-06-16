export type PushSubscriptionKeys = {
  p256dh: string
  auth: string
}

export type PushSubscriptionPayload = {
  endpoint: string
  expirationTime?: number | null
  keys: PushSubscriptionKeys
}

export type PushNotificationPayload = {
  title: string
  body: string
  url?: string
}
