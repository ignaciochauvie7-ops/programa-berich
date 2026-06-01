import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { NeonDots } from '../components/NeonDots'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../auth/supabaseClient'
import { BerichProgramView } from '../program/BerichProgramView'
import { BERICH_PROGRAM_SLUG } from '../program/berichProgramData'
import { AffiliateSection } from './AffiliateSection'
import './student.css'

function StudentProgramAuthenticated({ slug }: { slug: string }) {
  const { configured, loading, user, signOut } = useAuth()
  const [activeAlumno, setActiveAlumno] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!configured || !supabase || !user) {
        if (!cancelled) {
          setActiveAlumno(null)
          setChecking(false)
        }
        return
      }

      if (!cancelled) setChecking(true)

      const byUser = await supabase.from('alumnos').select('id, activo').eq('user_id', user.id).limit(1)
      let rows = byUser.data ?? []

      if (!rows.length && user.email) {
        const byEmail = await supabase
          .from('alumnos')
          .select('id, activo')
          .ilike('email', user.email.trim())
          .limit(1)
        if (!byEmail.error) rows = byEmail.data ?? []
      }

      if (cancelled) return

      if (byUser.error && !rows.length) {
        setActiveAlumno(false)
        setChecking(false)
        return
      }

      setActiveAlumno(Boolean(rows.some((row) => row.activo)))
      setChecking(false)
    })()

    return () => {
      cancelled = true
    }
  }, [configured, user, slug])

  if (!configured) {
    return (
      <div className="student-program">
        <NeonDots />
        <div className="student-program__gate">
          <h2>Área de alumnos</h2>
          <p>Esta instalación no tiene Supabase configurado todavía.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="student-program">
        <NeonDots />
        <div className="student-program__main">
          <p>Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `/programa/${slug}` }} />
  }

  if (checking || activeAlumno === null) {
    return (
      <div className="student-program">
        <NeonDots />
        <div className="student-program__main">
          <p>Verificando acceso…</p>
        </div>
      </div>
    )
  }

  if (!activeAlumno) {
    return (
      <div className="student-program">
        <NeonDots />
        <div className="student-program__gate">
          <h2>Sin acceso a este programa</h2>
          <p>
            Tu cuenta no está activa para este contenido. Revisá el link de invitación o pedile al administrador que
            confirme tu acceso.
          </p>
          <p>
            <Link to="/login">Volver al inicio de sesión</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="student-program">
      <NeonDots />
      <header className="student-program__bar">
        <p>
          <strong>Programa Berich</strong> — {user.email}
        </p>
        <div className="student-program__bar-actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => signOut()}>
            Salir
          </button>
        </div>
      </header>
      <main className="student-program__main">
        <BerichProgramView key={user.id} variant="student" progressNamespace={user.id} />
        <AffiliateSection />
      </main>
    </div>
  )
}

export function StudentProgramRoute() {
  const { slug = BERICH_PROGRAM_SLUG } = useParams<{ slug: string }>()

  if (slug !== BERICH_PROGRAM_SLUG) {
    return <Navigate to={`/programa/${BERICH_PROGRAM_SLUG}`} replace />
  }

  return <StudentProgramAuthenticated slug={slug} />
}
