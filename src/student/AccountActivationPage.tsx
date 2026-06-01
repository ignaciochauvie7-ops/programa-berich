import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../auth/supabaseClient'
import { useAuth } from '../auth/useAuth'
import activationLogo from '../../supabase/IMG_3353.jpg'
import './student.css'

export function AccountActivationPage() {
  const { configured, loading, session, user } = useAuth()
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setCheckingInvite(false)
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
      setError('Abrí esta página desde el link de invitación que llegó por mail.')
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

  return (
    <div className="student-auth">
      <form className="student-auth__card" onSubmit={onSubmit}>
        <img className="student-auth__logo" src={activationLogo} alt="Berich" />
        <h1>Activá tu cuenta</h1>
        {waitingForInvite ? (
          <p>Validando invitación…</p>
        ) : !user ? (
          <p>Para crear tu contraseña, abrí esta página desde el link de invitación que llegó por mail.</p>
        ) : (
          <>
            <p>Creá tu contraseña para acceder al Programa Berich</p>
            {error ? <div className="student-auth__error">{error}</div> : null}
            <div className="student-auth__field">
              <label htmlFor="activate-password">Contraseña</label>
              <input
                id="activate-password"
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
              <label htmlFor="activate-password-confirm">Confirmar contraseña</label>
              <input
                id="activate-password-confirm"
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
              <button type="submit" className="student-auth__button" disabled={busy}>
                {busy ? 'Activando…' : 'Activar cuenta'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
