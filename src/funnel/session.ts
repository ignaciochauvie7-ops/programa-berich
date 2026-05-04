import type { FunnelBranch } from './types'

const stepKey = (slug: string) => `funnel:${slug}:step`
const visitedKey = (slug: string) => `funnel:${slug}:visited`
const branchKey = (slug: string) => `funnel:${slug}:branch`

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

export function clearFunnelSession(slug: string): void {
  try {
    sessionStorage.removeItem(stepKey(slug))
    sessionStorage.removeItem(visitedKey(slug))
    sessionStorage.removeItem(branchKey(slug))
  } catch {
    /* ignore */
  }
}
