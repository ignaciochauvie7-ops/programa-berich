import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../auth/supabaseClient'
import { useAuth } from '../auth/useAuth'
import { BERICH_PROGRAM_SLUG } from '../program/berichProgramData'
import './student.css'

type PreviewState =
  | { status: 'idle' | 'loading' }
  | { status: 'ok'; email: string }
  | { status: 'error'; message: string }

export function StudentInviteSignupPage() {
  const { configured, loading: authLoading, user } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [preview, setPreview] = useState<PreviewState>({ status: 'idle' })
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token || !configured) return
    let cancelled = false

    void (async () => {
      if (!cancelled) setPreview({ status: 'loading' })
      try {
        const r = await fetch(`/api/invite/preview?token=${encodeURIComponent(token)}`)
        const body = (await r.json()) as { email?: string; error?: string }
        if (cancelled) return
        if (!r.ok) {
          setPreview({ status: 'error', message: body.error ?? 'Invitación inválida o vencida.' })
          return
        }
        if (!body.email) {
          setPreview({ status: 'error', message: 'Respuesta inválida del servidor.' })
          return
        }
        setPreview({ status: 'ok', email: body.email })
      } catch {
        if (!cancelled) setPreview({ status: 'error', message: 'No se pudo validar la invitación.' })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, configured])

  if (!configured) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Crear cuenta</h1>
          <p>Supabase no está configurado en esta instalación.</p>
        </div>
      </div>
    )
  }

  if (!authLoading && user) {
    return <Navigate to={`/programa/${BERICH_PROGRAM_SLUG}`} replace />
  }

  if (!token) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Crear cuenta</h1>
          <p>Falta el token de invitación en el link. Abrí el enlace que te llegó por mail.</p>
          <p className="student-auth__hint">
            <Link to="/ingresar">Ya tengo cuenta</Link>
          </p>
        </div>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (preview.status !== 'ok') return
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/invite/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const body = (await res.json()) as { error?: string; email?: string }
      if (!res.ok) {
        setError(body.error ?? 'No se pudo crear la cuenta.')
        setBusy(false)
        return
      }
      if (!supabase || !body.email) {
        setError('Error interno al iniciar sesión.')
        setBusy(false)
        return
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: body.email, password })
      if (signErr) {
        setError('Cuenta creada, pero el ingreso automático falló. Probá en "Ingresar".')
        setBusy(false)
        return
      }
    } catch {
      setError('Error de red. Probá de nuevo.')
    }
    setBusy(false)
  }

  return (
    <div className="student-auth">
      <form className="student-auth__card" onSubmit={onSubmit}>
        <h1>Crear tu cuenta</h1>
        {preview.status === 'loading' || preview.status === 'idle' ? (
          <p>Validando invitación…</p>
        ) : preview.status === 'error' ? (
          <>
            <p>{preview.message}</p>
            <p className="student-auth__hint">
              <Link to="/ingresar">Ir a ingresar</Link>
            </p>
          </>
        ) : preview.status === 'ok' ? (
          <>
            <p>
              Vas a registrar el acceso para <strong>{preview.email}</strong>. Elegí una contraseña para entrar al
              programa.
            </p>
            {error ? <div className="student-auth__error">{error}</div> : null}
            <div className="student-auth__field">
              <label htmlFor="invite-pw">Contraseña</label>
              <input
                id="invite-pw"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="student-auth__field">
              <label htmlFor="invite-pw2">Repetir contraseña</label>
              <input
                id="invite-pw2"
                name="password2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="student-auth__actions">
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy || authLoading}>
                {busy ? 'Creando…' : 'Crear cuenta e ingresar'}
              </button>
            </div>
            <p className="student-auth__hint">
              <Link to="/ingresar">Ya tengo cuenta</Link>
            </p>
          </>
        ) : null}
      </form>
    </div>
  )
}
