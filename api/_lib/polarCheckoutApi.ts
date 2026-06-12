import { polarAccessToken, polarApiBaseUrl } from './polarConfig.js'

export async function fetchPolarCheckout(
  checkoutId: string,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string; status: number }> {
  const token = polarAccessToken()
  if (!token) {
    return { ok: false, error: 'Polar no configurado', status: 500 }
  }

  const id = checkoutId.trim()
  if (!id) {
    return { ok: false, error: 'checkout_id inválido', status: 400 }
  }

  try {
    const res = await fetch(`${polarApiBaseUrl()}/checkouts/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    let data: Record<string, unknown> = {}
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      return { ok: false, error: 'respuesta inválida de Polar', status: 502 }
    }

    if (!res.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : `Polar ${res.status}`
      return { ok: false, error: detail, status: res.status === 404 ? 404 : 502 }
    }

    return { ok: true, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'request failed'
    return { ok: false, error: message, status: 502 }
  }
}
