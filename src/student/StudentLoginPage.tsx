import { useEffect, useState, type FormEvent } from 'react'
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
import { PasswordField } from './PasswordField'
import './student.css'

type LoginView = 'login' | 'forgot' | 'forgot-sent'

export function StudentLoginPage() {
  const { configured, loading, user, signIn, resetPassword } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const checkoutSuccess = searchParams.get('checkout') === 'success'
  const requestedFrom = (location.state as { from?: string } | null)?.from
  const defaultStudentPath = `/programa/${BERICH_PROGRAM_SLUG}`
  const from =
    requestedFrom ??
    (user ? (isAdminUser(user) ? '/control/funnels' : defaultStudentPath) : defaultStudentPath)

  const rememberedOnLoad = loadRememberedLoginEmail()
  const [view, setView] = useState<LoginView>('login')
  const [email, setEmail] = useState(() => rememberedOnLoad ?? '')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(rememberedOnLoad))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const wantForgot = (location.state as { forgot?: boolean } | null)?.forgot
    if (wantForgot) {
      setView('forgot')
      setError(null)
    }
  }, [location.state])

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

  async function onSubmitLogin(e: FormEvent) {
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
  }

  async function onSubmitForgot(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await resetPassword(email)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    setView('forgot-sent')
  }

  if (view === 'forgot' || view === 'forgot-sent') {
    return (
      <div className="student-auth">
        <form
          className="student-auth__card"
          onSubmit={view === 'forgot' ? onSubmitForgot : (e) => e.preventDefault()}
          autoComplete="on"
        >
          <img className="student-auth__logo" src={loginLogo} alt="Berich" />
          <h1>{view === 'forgot-sent' ? 'Revisá tu mail' : 'Recuperar contraseña'}</h1>
          {view === 'forgot-sent' ? (
            <p className="student-auth__success">
              Si hay una cuenta con <strong>{email.trim()}</strong>, te enviamos un link para elegir una nueva
              contraseña. Revisá la bandeja de entrada y el spam.
            </p>
          ) : (
            <p>Ingresá el mail de tu cuenta. Te enviaremos un link para restablecer la contraseña.</p>
          )}
          {error && view === 'forgot' ? <div className="student-auth__error">{error}</div> : null}
          {view === 'forgot' ? (
            <div className="student-auth__field">
              <label htmlFor="forgot-email">Mail</label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          ) : null}
          <div className="student-auth__actions">
            {view === 'forgot' ? (
              <button type="submit" className="student-auth__button" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar link'}
              </button>
            ) : null}
            <button
              type="button"
              className="student-auth__link-button"
              onClick={() => {
                setView('login')
                setError(null)
              }}
            >
              Volver a ingresar
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="student-auth">
      <form className="student-auth__card" onSubmit={onSubmitLogin} autoComplete="on">
        <img className="student-auth__logo" src={loginLogo} alt="Berich" />
        <h1>Accedé al programa</h1>
        <p>Ingresá con tu mail y contraseña</p>
        {checkoutSuccess ? (
          <p className="student-auth__success">
            Pago recibido. Si es tu primera vez, abrí el mail de activación y creá tu contraseña. Si ya activaste,
            ingresá abajo.
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
        <PasswordField
          id="student-password"
          name="password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        <p className="student-auth__forgot-wrap">
          <button
            type="button"
            className="student-auth__link-button student-auth__link-button--inline"
            onClick={() => {
              setView('forgot')
              setError(null)
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </p>
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
      </form>
    </div>
  )
}
