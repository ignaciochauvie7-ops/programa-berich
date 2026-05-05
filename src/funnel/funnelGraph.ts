import type { FunnelStep } from './types'

/** Destinos internos desde un paso (para estimar cuánto falta del recorrido). */
export function getOutgoingStepIds(step: FunnelStep): string[] {
  const ids: string[] = []
  switch (step.type) {
    case 'content':
    case 'height_slider':
    case 'weight_slider':
    case 'analysis_loading':
    case 'prefinal_loading':
      if (step.nextId?.trim()) ids.push(step.nextId.trim())
      break
    case 'question_single':
      for (const o of step.options) {
        if (o.nextId?.trim()) ids.push(o.nextId.trim())
      }
      break
    case 'question_multi':
      if (step.nextId?.trim()) ids.push(step.nextId.trim())
      break
    case 'video_youtube':
      if (step.formNextId?.trim()) ids.push(step.formNextId.trim())
      if (step.nextId?.trim()) ids.push(step.nextId.trim())
      break
    case 'cta_external':
      if (step.nextId?.trim()) ids.push(step.nextId.trim())
      break
    case 'outcome':
    case 'berich_close':
      break
    default:
      break
  }
  return [...new Set(ids)]
}

/**
 * Cadena más larga desde cada id (incluye el nodo actual): 1 = terminal sin salidas.
 */
export function computeTailDepthByStepId(steps: FunnelStep[]): Map<string, number> {
  const byId = new Map(steps.map((s) => [s.id, s]))
  const memo = new Map<string, number>()
  const visiting = new Set<string>()

  function dfs(id: string): number {
    if (memo.has(id)) return memo.get(id)!
    if (visiting.has(id)) {
      return 1
    }
    visiting.add(id)
    const step = byId.get(id)
    if (!step) {
      memo.set(id, 1)
      visiting.delete(id)
      return 1
    }
    const outs = getOutgoingStepIds(step)
    if (outs.length === 0) {
      memo.set(id, 1)
      visiting.delete(id)
      return 1
    }
    let maxChild = 0
    for (const o of outs) {
      maxChild = Math.max(maxChild, dfs(o))
    }
    const d = 1 + maxChild
    memo.set(id, d)
    visiting.delete(id)
    return d
  }

  for (const s of steps) {
    dfs(s.id)
  }
  return memo
}

/**
 * Progreso 0→1: pasos ya recorridos en el historial vs pasos hasta el final (peor rama desde aquí).
 */
export function funnelProgressRatio(params: {
  historyLength: number
  currentStepId: string
  tailDepthById: Map<string, number>
}): number {
  const forward = Math.max(0, params.historyLength - 1)
  const tail = params.tailDepthById.get(params.currentStepId) ?? 1
  const rem = Math.max(0, tail - 1)
  const denom = forward + rem
  if (denom <= 0) return 1
  return Math.min(1, Math.max(0, forward / denom))
}
