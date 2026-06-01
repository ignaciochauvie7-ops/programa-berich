const STORAGE_KEY = 'berich.rememberedLoginEmail'

export function loadRememberedLoginEmail(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)?.trim()
    return value || null
  } catch {
    return null
  }
}

export function saveRememberedLoginEmail(email: string): void {
  if (typeof window === 'undefined') return
  try {
    const trimmed = email.trim()
    if (!trimmed) return
    window.localStorage.setItem(STORAGE_KEY, trimmed)
  } catch {
    // private mode / quota — ignore
  }
}

export function clearRememberedLoginEmail(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
