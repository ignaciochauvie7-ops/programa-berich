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

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Poco o nada' },
  { value: 'light', label: '1-3 veces por semana' },
  { value: 'moderate', label: '3-5 veces por semana' },
  { value: 'active', label: '6-7 veces por semana' },
  { value: 'very_active', label: 'Muy intenso todos los días' },
] as const

type ActivityLevel = (typeof ACTIVITY_OPTIONS)[number]['value']

type SetupSummary = {
  has_quiz: boolean
  goal?: string
  impediment?: string
  weight_kg?: number
  preview?: {
    calorie_target_label: string
    water_liters: string
    steps_target: number
  } | null
}

export function CoachSetupPage() {
  const { configured, loading, session, user } = useAuth()
  const [checking, setChecking] = useState(true)
  const [alreadyComplete, setAlreadyComplete] = useState(false)
  const [phone, setPhone] = useState('')
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 3, 5])
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [summary, setSummary] = useState<SetupSummary | null>(null)
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

  useEffect(() => {
    if (!session || checking || alreadyComplete) return

    void (async () => {
      try {
        const res = await fetch(`/api/coach/setup-summary?activity_level=${activityLevel}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          setSummary((await res.json()) as SetupSummary)
        }
      } catch {
        /* ignore */
      }
    })()
  }, [session, activityLevel, checking, alreadyComplete])

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
          activity_level: activityLevel,
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
        <p>Completá estos datos para que te escribamos por WhatsApp con recordatorios según tu perfil del programa.</p>

        {summary?.has_quiz && summary.preview ? (
          <div className="coach-setup__summary">
            <p>
              Según tu evaluación: objetivo <strong>{summary.goal}</strong>
              {summary.weight_kg ? ` · ${summary.weight_kg} kg` : ''}.
            </p>
            <p>
              Referencia diaria: <strong>{summary.preview.calorie_target_label} kcal</strong>, agua{' '}
              <strong>~{summary.preview.water_liters} L</strong>, pasos orientativos{' '}
              <strong>{summary.preview.steps_target.toLocaleString('es-UY')}</strong>.
            </p>
            {summary.impediment ? (
              <p className="coach-setup__impediment">Enfocamos tips para: {summary.impediment}</p>
            ) : null}
          </div>
        ) : null}

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
          <label className="coach-setup__label">¿Qué días vas a entrenar?</label>
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

        <div className="student-auth__field">
          <label className="coach-setup__label">¿Cuánta actividad física hacés por semana?</label>
          <div className="coach-setup__activity">
            {ACTIVITY_OPTIONS.map((opt) => (
              <label key={opt.value} className="coach-setup__radio">
                <input
                  type="radio"
                  name="activity"
                  value={opt.value}
                  checked={activityLevel === opt.value}
                  onChange={() => setActivityLevel(opt.value)}
                  disabled={busy}
                />
                <span>{opt.label}</span>
              </label>
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
