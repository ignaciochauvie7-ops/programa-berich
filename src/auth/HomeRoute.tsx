import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { isAdminUser } from './access'
import { supabase } from './supabaseClient'
import '../student/student.css'

function hasPendingAuthHash(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hash.includes('access_token')
}

export function HomeRoute() {
  const { configured, loading, user } = useAuth()
  const [target, setTarget] = useState<string | null>(null)
  const [waitingHash, setWaitingHash] = useState(hasPendingAuthHash)

  useEffect(() => {
    if (!waitingHash) return
    const timer = window.setTimeout(() => setWaitingHash(false), 4000)
    return () => window.clearTimeout(timer)
  }, [waitingHash])

  useEffect(() => {
    if (waitingHash && user) setWaitingHash(false)
  }, [waitingHash, user])

  useEffect(() => {
    if (!configured) return
    if (loading || waitingHash) return

    if (!user) {
      setTarget('/login')
      return
    }

    if (isAdminUser(user)) {
      setTarget('/control/funnels')
      return
    }

    let cancelled = false

    void (async () => {
      if (!supabase || !user.email) {
        if (!cancelled) setTarget('/login')
        return
      }

      const byUser = await supabase.from('alumnos').select('activo').eq('user_id', user.id).maybeSingle()
      if (cancelled) return

      if (byUser.data?.activo) {
        setTarget('/programa')
        return
      }

      const byEmail = await supabase
        .from('alumnos')
        .select('activo')
        .ilike('email', user.email.trim())
        .maybeSingle()

      if (cancelled) return

      if (byEmail.data?.activo) {
        setTarget('/programa')
        return
      }

      if (byEmail.data || byUser.data) {
        setTarget('/activar-cuenta')
        return
      }

      setTarget('/login')
    })()

    return () => {
      cancelled = true
    }
  }, [configured, loading, user, waitingHash])

  if (!configured) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Acceso privado</h1>
          <p>Supabase no está configurado en esta instalación.</p>
        </div>
      </div>
    )
  }

  if (loading || !target || waitingHash) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Cargando…</h1>
          <p>{waitingHash ? 'Validando invitación…' : 'Preparando tu acceso.'}</p>
        </div>
      </div>
    )
  }

  return <Navigate to={target} replace />
}
