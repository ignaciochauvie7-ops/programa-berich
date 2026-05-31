import type { User } from '@supabase/supabase-js'

function splitEmails(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false

  const role = user.app_metadata?.role ?? user.user_metadata?.role
  if (role === 'admin') return true

  return splitEmails(import.meta.env.VITE_ADMIN_EMAILS as string | undefined).includes(user.email.toLowerCase())
}
