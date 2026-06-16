import type { SupabaseClient } from '@supabase/supabase-js'

/** Techo mensual por alumno (recordatorios push proactivos). */
export const COACH_MONTHLY_LIMITS = {
  proactive: 24,
  totalOutbound: 26,
} as const

export function monthKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).format(date)
}

function messageInMonth(createdAt: string, timeZone: string, targetMonth: string): boolean {
  return monthKey(new Date(createdAt), timeZone) === targetMonth
}

export async function countOutboundThisMonth(
  admin: SupabaseClient,
  alumnoId: string,
  timeZone: string,
  options: {
    messageTypes?: Array<'text' | 'template' | 'proactive' | 'reply'>
    now?: Date
  } = {},
): Promise<number> {
  const now = options.now ?? new Date()
  const targetMonth = monthKey(now, timeZone)
  const since = new Date(now.getTime() - 35 * 86400000).toISOString()

  const { data, error } = await admin
    .from('coach_messages')
    .select('message_type, created_at')
    .eq('alumno_id', alumnoId)
    .eq('direction', 'outbound')
    .gte('created_at', since)

  if (error || !data) return 0

  const types = options.messageTypes
  return data.filter((row) => {
    if (!messageInMonth(row.created_at as string, timeZone, targetMonth)) return false
    if (types?.length && !types.includes(row.message_type as (typeof types)[number])) return false
    return true
  }).length
}

export async function canSendProactive(
  admin: SupabaseClient,
  alumnoId: string,
  timeZone: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [proactive, total] = await Promise.all([
    countOutboundThisMonth(admin, alumnoId, timeZone, { messageTypes: ['proactive'] }),
    countOutboundThisMonth(admin, alumnoId, timeZone),
  ])

  if (proactive >= COACH_MONTHLY_LIMITS.proactive) {
    return { ok: false, reason: 'monthly proactive cap' }
  }
  if (total >= COACH_MONTHLY_LIMITS.totalOutbound) {
    return { ok: false, reason: 'monthly outbound cap' }
  }
  return { ok: true }
}
