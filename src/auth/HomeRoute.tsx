import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { isAdminUser } from './access'
import { supabase } from './supabaseClient'
import '../student/student.css'

export function HomeRoute() {
  const { configured, loading, user } = useAuth()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!configured) return
    if (loading) return

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
  }, [configured, loading, user])

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

  if (loading || !target) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Cargando…</h1>
          <p>Preparando tu acceso.</p>
        </div>
      </div>
    )
  }

  return <Navigate to={target} replace />
}
