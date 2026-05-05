import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { NeonDots } from '../funnel/NeonDots'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../auth/supabaseClient'
import { BerichProgramView } from '../program/BerichProgramView'
import { BERICH_PROGRAM_SLUG } from '../program/berichProgramData'
import { isStudentUiDevPreview } from './studentDevPreview'
import './student.css'

const PREVIEW_PROGRESS_KEY = 'preview-local'

function StudentProgramDevPreview() {
  return (
    <div className="student-program">
      <NeonDots />
      <p className="student-program__dev-banner" role="status">
        <strong>Solo en tu entorno de desarrollo:</strong> esto es la vista alumno sin login ni Shopify. En producción
        acá solo entra quien compró y creó cuenta. Tu edición interna sigue en{' '}
        <Link to="/control/programas">Centro de control → Programas</Link>.
      </p>
      <main className="student-program__main">
        <BerichProgramView variant="student" progressNamespace={PREVIEW_PROGRESS_KEY} />
      </main>
    </div>
  )
}

function StudentProgramAuthenticated({ slug }: { slug: string }) {
  const { configured, loading, user, signOut } = useAuth()
  const [entitled, setEntitled] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      if (!configured || !supabase || !user) {
        if (!cancelled) {
          setEntitled(null)
          setChecking(false)
        }
        return
      }

      if (!cancelled) setChecking(true)

      const { data, error } = await supabase.from('entitlements').select('id').eq('product_slug', slug).limit(1)

      if (cancelled) return

      if (error) {
        setEntitled(false)
        setChecking(false)
        return
      }

      setEntitled((data?.length ?? 0) > 0)
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
    return <Navigate to="/ingresar" replace state={{ from: `/programa/${slug}` }} />
  }

  if (checking || entitled === null) {
    return (
      <div className="student-program">
        <NeonDots />
        <div className="student-program__main">
          <p>Verificando acceso…</p>
        </div>
      </div>
    )
  }

  if (!entitled) {
    return (
      <div className="student-program">
        <NeonDots />
        <div className="student-program__gate">
          <h2>Sin acceso a este programa</h2>
          <p>
            Tu cuenta no tiene habilitado este contenido. Si acabás de pagar, puede tardar unos minutos; si pagaste en
            efectivo, el acceso se habilita cuando se confirma el pago.
          </p>
          <p>
            <Link to="/ingresar">Volver al inicio de sesión</Link>
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
      </main>
    </div>
  )
}

export function StudentProgramRoute() {
  const { slug = BERICH_PROGRAM_SLUG } = useParams<{ slug: string }>()

  if (slug !== BERICH_PROGRAM_SLUG) {
    return <Navigate to={`/programa/${BERICH_PROGRAM_SLUG}`} replace />
  }

  if (isStudentUiDevPreview) {
    return <StudentProgramDevPreview />
  }

  return <StudentProgramAuthenticated slug={slug} />
}
