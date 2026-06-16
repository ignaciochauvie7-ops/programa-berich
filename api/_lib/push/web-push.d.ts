declare module 'web-push' {
  export type VapidKeys = {
    publicKey: string
    privateKey: string
  }

  export function generateVAPIDKeys(): VapidKeys
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  export function sendNotification(
    subscription: unknown,
    payload: string | Buffer | null,
    options?: { TTL?: number },
  ): Promise<void>
}
