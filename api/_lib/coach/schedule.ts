import type { CoachProfile } from './types.js'

const WEEKDAY_MON = 1
const WEEKDAY_SAT = 6
const WEEKDAY_SUN = 0

export function hashSeed(...parts: string[]): number {
  let hash = 0
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      hash = (hash * 31 + part.charCodeAt(i)) >>> 0
    }
  }
  return hash
}

export function localDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Lunes de la semana local (clave estable para variar 4–6 envíos/semana). */
export function localWeekKey(date: Date, timeZone: string): string {
  const local = localParts(date, timeZone)
  const daysFromMonday = local.day === WEEKDAY_SUN ? 6 : local.day - WEEKDAY_MON
  const monday = new Date(date.getTime() - daysFromMonday * 86400000)
  return localDateKey(monday, timeZone)
}

export function localParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase() ?? ''
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  const dayMap: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  }
  return { day: dayMap[weekday.slice(0, 3)] ?? date.getUTCDay(), hour, minute }
}

/** 4, 5 o 6 recordatorios por semana (lun–sáb), determinístico por alumno + semana. */
export function weeklyDigestCount(alumnoId: string, weekKey: string): number {
  return 4 + (hashSeed(alumnoId, weekKey, 'count') % 3)
}

function seededPickDays(alumnoId: string, weekKey: string, count: number): number[] {
  const pool = [1, 2, 3, 4, 5, 6]
  const seed = hashSeed(alumnoId, weekKey, 'days')
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = (hashSeed(String(seed), String(i)) + i) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }

  let selected = shuffled.slice(0, count).sort((a, b) => a - b)

  if (count >= 4 && !selected.includes(WEEKDAY_SAT)) {
    selected = [...selected.slice(1), WEEKDAY_SAT].sort((a, b) => a - b)
  }

  return selected
}

/** Lunes a sábado: un recordatorio por día (domingo off). */
export function isDigestDay(_alumnoId: string, date: Date, timeZone: string): boolean {
  const local = localParts(date, timeZone)
  return local.day !== WEEKDAY_SUN
}

/** No enviar recordatorios hasta el primer día de entreno (incluido hoy si le toca). */
export function isPastFirstTrainingDay(profile: CoachProfile, now: Date, timeZone: string): boolean {
  const trainingDays = profile.training_days
  if (!trainingDays.length) return true

  const setup = new Date(profile.setup_completed_at)
  const todayKey = localDateKey(now, timeZone)

  for (let i = 0; i <= 21; i += 1) {
    const candidate = new Date(setup.getTime() + i * 86400000)
    const day = localParts(candidate, timeZone).day
    if (!trainingDays.includes(day)) continue

    const dayKey = localDateKey(candidate, timeZone)
    return dayKey <= todayKey
  }

  return true
}

export function digestDayIndex(alumnoId: string, date: Date, timeZone: string): number {
  return hashSeed(alumnoId, localDateKey(date, timeZone))
}

export function isSilentDays(profile: CoachProfile, days: number, now = new Date()): boolean {
  if (!profile.last_user_reply_at) return false
  return now.getTime() - new Date(profile.last_user_reply_at).getTime() >= days * 86400000
}
