import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { isAdminUser } from '../auth/access'
import { useAuth } from '../auth/useAuth'
import { BERICH_PROGRAM_SLUG } from '../program/berichProgramData'
import loginLogo from '../../supabase/IMG_3353.jpg'
import './student.css'

export function StudentLoginPage() {
  const { configured, loading, user, signIn } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const requestedFrom = (location.state as { from?: string } | null)?.from
  const from =
    requestedFrom ?? (user ? (isAdminUser(user) ? '/control/funnels' : `/programa/${BERICH_PROGRAM_SLUG}`) : '/control/funnels')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!configured) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Acceso alumnos</h1>
          <p>
            Falta configurar Supabase en el proyecto (<code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>). Pedile a quien administra el deploy que revise las variables de
            entorno.
          </p>
        </div>
      </div>
    )
  }

  if (!loading && user) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await signIn(email, password)
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="student-auth">
      <form className="student-auth__card" onSubmit={onSubmit}>
        <img className="student-auth__logo" src={loginLogo} alt="Berich" />
        <h1>Accedé al programa</h1>
        <p>Ingresá con tu mail y contraseña</p>
        {checkoutSuccess ? (
          <p className="student-auth__success">
            Pago recibido. Revisá tu mail para el link de activación; después ingresá acá con la contraseña que elijas.
          </p>
        ) : null}
        {error ? <div className="student-auth__error">{error}</div> : null}
        <div className="student-auth__field">
          <label htmlFor="student-email">Mail</label>
          <input
            id="student-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="student-auth__field">
          <label htmlFor="student-password">Contraseña</label>
          <input
            id="student-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="student-auth__actions">
          <button type="submit" className="student-auth__button" disabled={busy || loading}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
        <p className="student-auth__hint">Si no recibiste tu invitación, contactate con el administrador</p>
      </form>
    </div>
  )
}
