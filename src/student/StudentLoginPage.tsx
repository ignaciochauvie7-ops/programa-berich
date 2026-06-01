import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { isAdminUser } from '../auth/access'
import { useAuth } from '../auth/useAuth'
import {
  clearRememberedLoginEmail,
  loadRememberedLoginEmail,
  saveRememberedLoginEmail,
} from '../auth/rememberedLoginEmail'
import { BERICH_PROGRAM_SLUG } from '../program/berichProgramData'
import loginLogo from '../../supabase/IMG_3353.jpg'
import './student.css'

export function StudentLoginPage() {
  const { configured, loading, user, signIn } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const requestedFrom = (location.state as { from?: string } | null)?.from
  const defaultStudentPath = `/programa/${BERICH_PROGRAM_SLUG}`
  const from =
    requestedFrom ??
    (user ? (isAdminUser(user) ? '/control/funnels' : defaultStudentPath) : defaultStudentPath)

  const rememberedOnLoad = loadRememberedLoginEmail()
  const [email, setEmail] = useState(() => rememberedOnLoad ?? '')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(rememberedOnLoad))
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

  if (loading) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <img className="student-auth__logo" src={loginLogo} alt="Berich" />
          <h1>Accedé al programa</h1>
          <p>Cargando tu sesión…</p>
        </div>
      </div>
    )
  }

  if (user) {
    if (isAdminUser(user)) {
      const dest = from.startsWith('/control') ? from : '/control/funnels'
      return <Navigate to={dest} replace />
    }
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await signIn(email, password)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    if (rememberEmail) {
      saveRememberedLoginEmail(email)
    } else {
      clearRememberedLoginEmail()
    }
    // La redirección la hace el bloque de arriba cuando `user` se actualiza.
  }

  return (
    <div className="student-auth">
      <form className="student-auth__card" onSubmit={onSubmit} autoComplete="on">
        <img className="student-auth__logo" src={loginLogo} alt="Berich" />
        <h1>Accedé al programa</h1>
        <p>Ingresá con tu mail y contraseña</p>
        <p className="student-auth__session-note">
          En este dispositivo podés quedar con la sesión iniciada: al volver a entrar no hace falta iniciar sesión de
          nuevo, salvo que uses «Salir» o borres los datos del sitio. La contraseña no se guarda en la app; tu navegador
          puede ofrecerte guardarla de forma segura.
        </p>
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
            inputMode="email"
            autoComplete="username email"
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
        <label className="student-auth__remember">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
          />
          <span>Recordar mi correo en este dispositivo</span>
        </label>
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
