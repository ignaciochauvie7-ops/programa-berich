import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { BERICH_PROGRAM_SLUG } from '../program/berichProgramData'
import './student.css'

export function StudentLoginPage() {
  const { configured, loading, user, signIn } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? `/programa/${BERICH_PROGRAM_SLUG}`

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
        <h1>Ingresar</h1>
        <p>Usá el mismo mail con el que compraste y la clave que definiste al crear tu cuenta.</p>
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
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy || loading}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </div>
        <p className="student-auth__hint">
          ¿Compraste y todavía no tenés cuenta? Revisá el mail de invitación o{' '}
          <Link to="/crear-cuenta">creala con el link</Link>.
        </p>
      </form>
    </div>
  )
}
