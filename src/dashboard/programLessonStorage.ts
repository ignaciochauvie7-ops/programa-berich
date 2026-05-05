const STORAGE_KEY_BASE = 'berich:program:lessons-done'

function storageKey(namespace?: string): string {
  if (!namespace) return STORAGE_KEY_BASE
  return `${STORAGE_KEY_BASE}:${namespace}`
}

export function readLessonCompletion(namespace?: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(namespace))
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string' && x.length > 0))
  } catch {
    return new Set()
  }
}

export function persistLessonCompletion(next: Set<string>, namespace?: string): void {
  try {
    localStorage.setItem(storageKey(namespace), JSON.stringify([...next]))
  } catch {
    /* ignore */
  }
}

export function progressPercent(keys: readonly string[], completed: Set<string>): number {
  if (keys.length === 0) return 0
  const done = keys.filter((k) => completed.has(k)).length
  return Math.round((done / keys.length) * 100)
}
