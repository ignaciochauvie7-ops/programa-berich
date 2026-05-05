import { parseFunnelDefinition, FunnelValidationError } from './validate'
import type { FunnelDefinition } from './types'

export { FunnelValidationError } from './validate'

export async function loadFunnelBySlug(slug: string): Promise<FunnelDefinition> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`funnel:draft:${slug}`)
      if (raw) {
        const draftJson = JSON.parse(raw) as unknown
        const draft = parseFunnelDefinition(draftJson)
        if (draft.slug === slug) return draft
      }
    } catch {
      /* ignore malformed drafts and fallback to public file */
    }
  }

  const path = `/funnels/${encodeURIComponent(slug)}.json`
  let res: Response
  try {
    res = await fetch(path, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
  } catch {
    throw new FunnelValidationError(`Network error loading funnel "${slug}"`)
  }
  if (!res.ok) {
    throw new FunnelValidationError(`Funnel "${slug}" not found (${res.status})`)
  }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new FunnelValidationError(`Invalid JSON for funnel "${slug}"`)
  }
  const def = parseFunnelDefinition(json)
  if (def.slug !== slug) {
    throw new FunnelValidationError(
      `Slug mismatch: URL "${slug}" vs JSON slug "${def.slug}"`,
    )
  }
  return def
}
