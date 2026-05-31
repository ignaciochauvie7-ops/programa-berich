import type { User } from '@supabase/supabase-js'
import { getSupabaseAdmin } from './supabaseAdmin'

function splitEmails(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export async function getRequestUser(request: Request): Promise<{ user: User | null; error: string | null }> {
  const admin = getSupabaseAdmin()
  if (!admin) return { user: null, error: 'server misconfigured' }

  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return { user: null, error: 'unauthorized' }

  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token)

  if (error || !user) return { user: null, error: 'unauthorized' }
  return { user, error: null }
}

export function getPublicOrigin(request: Request): string {
  const configured = process.env.APP_PUBLIC_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`

  const url = new URL(request.url)
  return url.origin
}

export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role === 'admin') return true

  return splitEmails(process.env.ADMIN_EMAILS).includes(user.email.toLowerCase())
}
