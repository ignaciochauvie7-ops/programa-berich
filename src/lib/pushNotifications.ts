function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

export async function subscribeToCoachPush(accessToken: string): Promise<{ ok: boolean; error?: string }> {
  return subscribeInternal(accessToken, false)
}

/** Desuscribe la suscripción actual del navegador y crea una nueva (útil en iPhone tras agregar al inicio). */
export async function resubscribeToCoachPush(accessToken: string): Promise<{ ok: boolean; error?: string }> {
  return subscribeInternal(accessToken, true)
}

async function subscribeInternal(
  accessToken: string,
  forceNew: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!publicKey?.trim()) {
    return { ok: false, error: 'Las notificaciones no están configuradas en el servidor.' }
  }

  if (!isPushSupported()) {
    return { ok: false, error: 'Tu navegador no soporta notificaciones push.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'Necesitamos permiso para enviarte recordatorios.' }
  }

  const registration = (await navigator.serviceWorker.ready) ?? (await registerServiceWorker())
  if (!registration) {
    return { ok: false, error: 'No se pudo activar el servicio de notificaciones.' }
  }

  let subscription = await registration.pushManager.getSubscription()
  if (forceNew && subscription) {
    await subscription.unsubscribe()
    subscription = null
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey.trim()) as BufferSource,
    })
  }

  const res = await fetch('/api/coach/subscribe', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })

  const body = (await res.json()) as { error?: string }
  if (!res.ok) return { ok: false, error: body.error ?? 'No se pudo guardar la suscripción.' }
  return { ok: true }
}
