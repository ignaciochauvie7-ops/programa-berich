import type { FunnelDefinition } from '../funnel/types'
import type { XYPosition } from 'reactflow'

function key(slug: string) {
  return `funnel:draft:${slug}`
}

function posKey(slug: string) {
  return `funnel:draft:${slug}:positions`
}

function backupKey(slug: string) {
  return `funnel:draft:${slug}:backups`
}

export type FunnelDraftBackup = {
  id: string
  savedAt: string
  def: FunnelDefinition
}

export function readFunnelDraft(slug: string): unknown | null {
  try {
    const raw = localStorage.getItem(key(slug))
    if (!raw) return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function writeFunnelDraft(slug: string, def: FunnelDefinition): void {
  try {
    localStorage.setItem(key(slug), JSON.stringify(def))
  } catch {
    /* ignore quota */
  }
}

export function clearFunnelDraft(slug: string): void {
  try {
    localStorage.removeItem(key(slug))
    localStorage.removeItem(posKey(slug))
  } catch {
    /* ignore */
  }
}

export function readFunnelNodePositions(slug: string): Record<string, XYPosition> {
  try {
    const raw = localStorage.getItem(posKey(slug))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, XYPosition>
  } catch {
    return {}
  }
}

export function writeFunnelNodePositions(slug: string, positions: Record<string, XYPosition>): void {
  try {
    localStorage.setItem(posKey(slug), JSON.stringify(positions))
  } catch {
    /* ignore */
  }
}

export function readFunnelDraftBackups(slug: string): FunnelDraftBackup[] {
  try {
    const raw = localStorage.getItem(backupKey(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is FunnelDraftBackup =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as FunnelDraftBackup).id === 'string' &&
          typeof (item as FunnelDraftBackup).savedAt === 'string' &&
          typeof (item as FunnelDraftBackup).def === 'object',
      )
      .slice(0, 20)
  } catch {
    return []
  }
}

export function writeFunnelDraftBackup(slug: string, def: FunnelDefinition): void {
  try {
    const next: FunnelDraftBackup = {
      id: Math.random().toString(36).slice(2, 10),
      savedAt: new Date().toISOString(),
      def,
    }
    const prev = readFunnelDraftBackups(slug)
    localStorage.setItem(backupKey(slug), JSON.stringify([next, ...prev].slice(0, 20)))
  } catch {
    /* ignore quota */
  }
}
