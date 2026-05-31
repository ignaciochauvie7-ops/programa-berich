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

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession()
  }, [])

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

    if (!supabase || !session) {
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

    const res = await fetch('/api/alumnos/activate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    const body = (await res.json()) as { error?: string }
    if (!res.ok) {
      setError(body.error ?? 'No se pudo activar la cuenta.')
      setBusy(false)
      return
    }

    setBusy(false)
    setDone(true)
  }

  return (
    <div className="student-auth">
      <form className="student-auth__card" onSubmit={onSubmit}>
        <img className="student-auth__logo" src={activationLogo} alt="Berich" />
        <h1>Activá tu cuenta</h1>
        {loading ? (
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
