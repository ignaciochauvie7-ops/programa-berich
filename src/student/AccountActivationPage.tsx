import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../auth/supabaseClient'
import { useAuth } from '../auth/useAuth'
import activationLogo from '../../supabase/IMG_3353.jpg'
import { PasswordField } from './PasswordField'
import './student.css'

function readPasswordRecoveryFromUrl(): boolean {
  if (typeof window === 'undefined') return false
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return false
  return new URLSearchParams(raw).get('type') === 'recovery'
}

export function AccountActivationPage() {
  const { configured, loading, session, user } = useAuth()
  const [isRecovery, setIsRecovery] = useState(readPasswordRecoveryFromUrl)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [checkingInvite, setCheckingInvite] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setCheckingInvite(false)
      return
    }

    void (async () => {
      await supabase.auth.getSession()
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setCheckingInvite(false)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
    })

    const timer = window.setTimeout(() => setCheckingInvite(false), 4000)

    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!supabase || !user || loading) return

    void (async () => {
      const byUser = await supabase.from('alumnos').select('activo').eq('user_id', user.id).maybeSingle()
      if (byUser.data?.activo) {
        setDone(true)
        return
      }

      if (user.email) {
        const byEmail = await supabase
          .from('alumnos')
          .select('activo')
          .ilike('email', user.email.trim())
          .maybeSingle()
        if (byEmail.data?.activo) setDone(true)
      }
    })()
  }, [loading, user])

  if (!configured) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Activar cuenta</h1>
          <p>Supabase no está configurado en esta instalación.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return <Navigate to="/programa" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!supabase || !session || !user) {
      setError(
        isRecovery
          ? 'Abrí esta página desde el link de recuperación que llegó por mail.'
          : 'Abrí esta página desde el link de invitación que llegó por mail.',
      )
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setBusy(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }

    if (isRecovery) {
      setBusy(false)
      setDone(true)
      return
    }

    const {
      data: { session: freshSession },
    } = await supabase.auth.getSession()

    const token = freshSession?.access_token ?? session.access_token

    let activateError: string | null = null

    try {
      const res = await fetch('/api/alumnos/activate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        activateError = body.error ?? 'activate api failed'
      }
    } catch {
      activateError = 'activate api unreachable'
    }

    if (activateError && supabase && user?.email) {
      const { data, error: directError } = await supabase
        .from('alumnos')
        .update({ user_id: user.id, activo: true })
        .ilike('email', user.email.trim())
        .select('id')
        .maybeSingle()

      if (directError || !data) {
        setError(
          activateError ??
            'No se pudo activar la cuenta. Si ya pagaste, revisá que el mail del link coincida con tu usuario.',
        )
        setBusy(false)
        return
      }
    } else if (activateError) {
      setError(activateError)
      setBusy(false)
      return
    }

    setBusy(false)
    setDone(true)
  }

  const waitingForInvite = loading || checkingInvite
  const title = isRecovery ? 'Nueva contraseña' : 'Activá tu cuenta'
  const intro = isRecovery
    ? 'Elegí una nueva contraseña para tu cuenta'
    : 'Creá tu contraseña para acceder al Programa Berich'
  const submitLabel = isRecovery ? 'Guardar contraseña' : 'Activar cuenta'
  const busyLabel = isRecovery ? 'Guardando…' : 'Activando…'

  return (
    <div className="student-auth">
      <form className="student-auth__card" onSubmit={onSubmit}>
        <img className="student-auth__logo" src={activationLogo} alt="Berich" />
        <h1>{title}</h1>
        {waitingForInvite ? (
          <p>Validando enlace…</p>
        ) : !user ? (
          <>
            <p>
              {isRecovery
                ? 'Para restablecer tu contraseña, abrí el link que te enviamos por mail.'
                : 'Para crear tu contraseña, abrí esta página desde el link de invitación que llegó por mail.'}
            </p>
            <p className="student-auth__hint">
              <Link to="/login">Ir a ingresar</Link>
              {isRecovery ? (
                <>
                  {' · '}
                  <Link to="/login" state={{ forgot: true }}>
                    Pedir otro link de recuperación
                  </Link>
                </>
              ) : null}
            </p>
          </>
        ) : (
          <>
            <p>{intro}</p>
            {error ? <div className="student-auth__error">{error}</div> : null}
            <PasswordField
              id="activate-password"
              name="password"
              label="Contraseña"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={busy}
            />
            <PasswordField
              id="activate-password-confirm"
              name="password2"
              label="Confirmar contraseña"
              value={password2}
              onChange={setPassword2}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={busy}
            />
            <div className="student-auth__actions">
              <button type="submit" className="student-auth__button" disabled={busy}>
                {busy ? busyLabel : submitLabel}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
