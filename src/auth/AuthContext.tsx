/* Context module: exporta AuthContext + AuthProvider. */
/* eslint-disable react-refresh/only-export-components */
import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, supabaseConfigured } from './supabaseClient'

export type AuthState = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(() => Boolean(supabase))

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase no está configurado.' }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (!error) return { error: null }
      return { error: error.message }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (/failed to fetch|networkerror|load failed/i.test(message)) {
        return {
          error:
            'No se pudo conectar con Supabase. Revisá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local (no uses los valores de ejemplo) y reiniciá npm run dev.',
        }
      }
      return { error: message }
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      configured: supabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      signIn,
      signOut,
    }),
    [loading, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
