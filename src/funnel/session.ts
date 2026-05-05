import type { FunnelBranch } from './types'

const stepKey = (slug: string) => `funnel:${slug}:step`
const visitedKey = (slug: string) => `funnel:${slug}:visited`
const branchKey = (slug: string) => `funnel:${slug}:branch`
const historyKey = (slug: string) => `funnel:${slug}:history`

export function readStoredStepId(slug: string): string | null {
  try {
    const v = sessionStorage.getItem(stepKey(slug))
    return v && v.trim() ? v.trim() : null
  } catch {
    return null
  }
}

export function writeStoredStepId(slug: string, stepId: string): void {
  try {
    sessionStorage.setItem(stepKey(slug), stepId)
  } catch {
    /* ignore quota */
  }
}

export function readVisitedIds(slug: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(visitedKey(slug))
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

export function appendVisitedId(slug: string, stepId: string): Set<string> {
  const set = readVisitedIds(slug)
  set.add(stepId)
  try {
    sessionStorage.setItem(visitedKey(slug), JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
  return set
}

export function readBranch(slug: string): FunnelBranch | null {
  try {
    const v = sessionStorage.getItem(branchKey(slug))?.trim()
    if (v === 'hombre' || v === 'mujer') return v
    return null
  } catch {
    return null
  }
}

export function writeBranch(slug: string, branch: FunnelBranch): void {
  try {
    sessionStorage.setItem(branchKey(slug), branch)
  } catch {
    /* ignore */
  }
}

export function readStepHistory(slug: string): string[] {
  try {
    const raw = sessionStorage.getItem(historyKey(slug))
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  } catch {
    return []
  }
}

export function pushStepHistory(slug: string, stepId: string): string[] {
  const history = readStepHistory(slug)
  if (history[history.length - 1] !== stepId) {
    history.push(stepId)
  }
  try {
    sessionStorage.setItem(historyKey(slug), JSON.stringify(history))
  } catch {
    /* ignore */
  }
  return history
}

export function popStepHistory(slug: string): { previous: string | null; history: string[] } {
  const history = readStepHistory(slug)
  if (history.length <= 1) return { previous: null, history }
  history.pop()
  const previous = history[history.length - 1] ?? null
  try {
    sessionStorage.setItem(historyKey(slug), JSON.stringify(history))
  } catch {
    /* ignore */
  }
  return { previous, history }
}

export function seedStepHistory(slug: string, initialStepId: string): string[] {
  const next = [initialStepId]
  try {
    sessionStorage.setItem(historyKey(slug), JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export function clearFunnelSession(slug: string): void {
  try {
    sessionStorage.removeItem(stepKey(slug))
    sessionStorage.removeItem(visitedKey(slug))
    sessionStorage.removeItem(branchKey(slug))
    sessionStorage.removeItem(historyKey(slug))
  } catch {
    /* ignore */
  }
}
