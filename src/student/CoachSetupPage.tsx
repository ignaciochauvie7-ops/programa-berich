import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../auth/supabaseClient'
import activationLogo from '../../supabase/IMG_3353.jpg'
import './student.css'

const DAY_OPTIONS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
] as const

export function CoachSetupPage() {
  const { configured, loading, session, user } = useAuth()
  const [checking, setChecking] = useState(true)
  const [alreadyComplete, setAlreadyComplete] = useState(false)
  const [phone, setPhone] = useState('')
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 3, 5])
  const [optIn, setOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!configured || loading || !user || !session) {
      if (!loading) setChecking(false)
      return
    }

    void (async () => {
      try {
        const res = await fetch('/api/coach/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const body = (await res.json()) as { complete?: boolean }
          if (body.complete) setAlreadyComplete(true)
        }
      } catch {
        /* ignore */
      } finally {
        setChecking(false)
      }
    })()
  }, [configured, loading, session, user])

  if (!configured) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Configurar perfil</h1>
          <p>Supabase no está configurado en esta instalación.</p>
        </div>
      </div>
    )
  }

  if (loading || checking) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Cargando…</h1>
        </div>
      </div>
    )
  }

  if (!user || !session) {
    return <Navigate to="/login" replace state={{ from: '/configurar-perfil' }} />
  }

  if (alreadyComplete) {
    return <Navigate to="/programa" replace />
  }

  function toggleDay(day: number) {
    setTrainingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!supabase || !session) return

    if (!optIn) {
      setError('Tenés que aceptar recibir mensajes por WhatsApp.')
      return
    }

    setBusy(true)

    try {
      const res = await fetch('/api/coach/enroll', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          training_days: trainingDays,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Montevideo',
          opt_in: true,
        }),
      })

      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'No se pudo guardar tu perfil.')
        setBusy(false)
        return
      }

      setAlreadyComplete(true)
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setBusy(false)
    }
  }

  return (
    <div className="student-auth">
      <form className="student-auth__card student-auth__card--wide" onSubmit={onSubmit}>
        <img className="student-auth__logo" src={activationLogo} alt="Berich" />
        <h1>Tu acompañamiento personalizado</h1>
        <p>Completá estos datos para que te escribamos por WhatsApp y te acompañemos con entrenamiento y alimentación.</p>

        {error ? <div className="student-auth__error">{error}</div> : null}

        <div className="student-auth__field">
          <label htmlFor="coach-phone">WhatsApp (con código de país)</label>
          <input
            id="coach-phone"
            type="tel"
            inputMode="tel"
            placeholder="+59899123456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={busy}
          />
        </div>

        <div className="student-auth__field">
          <label className="coach-setup__label">¿Qué días piensas entrenar?</label>
          <div className="coach-setup__days">
            {DAY_OPTIONS.map((day) => (
              <button
                key={day.value}
                type="button"
                className={'coach-setup__chip' + (trainingDays.includes(day.value) ? ' coach-setup__chip--on' : '')}
                onClick={() => toggleDay(day.value)}
                disabled={busy}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <label className="coach-setup__opt-in">
          <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} disabled={busy} />
          <span>Acepto recibir mensajes de acompañamiento del Programa Berich por WhatsApp.</span>
        </label>

        <div className="student-auth__actions">
          <button type="submit" className="student-auth__button" disabled={busy}>
            {busy ? 'Guardando…' : 'Continuar al programa'}
          </button>
        </div>
      </form>
    </div>
  )
}
