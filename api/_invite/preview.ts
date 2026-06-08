import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { sha256Hex } from '../_lib/crypto.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { getRequestUrl } from '../_lib/requestUrl.js'

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = getRequestUrl(request)
  const token = url.searchParams.get('token')
  if (!token) return json({ error: 'missing token' }, 400)

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const tokenHash = sha256Hex(token)
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('invite_tokens')
    .select('email, used_at, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !data) {
    return json({ error: 'invitación inválida' }, 404)
  }

  if (data.used_at) {
    return json({ error: 'invitación ya utilizada' }, 410)
  }

  if (data.expires_at < now) {
    return json({ error: 'invitación vencida' }, 410)
  }

  return json({ email: data.email })
}

export default webHandler(handler)
