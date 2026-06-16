import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { isPushSupported, registerServiceWorker, subscribeToCoachPush } from '../lib/pushNotifications'
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

type ProfileStatus = {
  complete?: boolean
  push_subscribed?: boolean
}

export function CoachSetupPage() {
  const { configured, loading, session, user } = useAuth()
  const [checking, setChecking] = useState(true)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null)
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 3, 5])
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [optIn, setOptIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pushDone, setPushDone] = useState(false)
  const pushSupported = isPushSupported()

  useEffect(() => {
    void registerServiceWorker()
  }, [])

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
          const body = (await res.json()) as ProfileStatus
          setProfileStatus(body)
          if (body.complete && body.push_subscribed) setPushDone(true)
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

  if (profileStatus?.complete && profileStatus.push_subscribed) {
    return <Navigate to="/programa" replace />
  }

  function toggleDay(day: number) {
    setTrainingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!session) return

    if (!optIn) {
      setError('Tenés que aceptar recibir notificaciones de acompañamiento.')
      return
    }

    if (trainingDays.length < 1) {
      setError('Elegí al menos un día de entrenamiento.')
      return
    }

    if (!pushSupported) {
      setError('Tu navegador no soporta notificaciones push. Probá con Chrome o Edge en el celular o la compu.')
      return
    }

    setBusy(true)

    try {
      const enrollRes = await fetch('/api/coach/enroll', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          training_days: trainingDays,
          activity_level: activityLevel,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Montevideo',
          opt_in: true,
        }),
      })

      const enrollBody = (await enrollRes.json()) as { error?: string }
      if (!enrollRes.ok) {
        setError(enrollBody.error ?? 'No se pudo guardar tu perfil.')
        setBusy(false)
        return
      }

      const pushResult = await subscribeToCoachPush(session.access_token)
      if (!pushResult.ok) {
        setProfileStatus({ complete: true, push_subscribed: false })
        setError(pushResult.error ?? 'No se pudieron activar las notificaciones.')
        setBusy(false)
        return
      }

      setProfileStatus({ complete: true, push_subscribed: true })
      setPushDone(true)
      setBusy(false)
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setBusy(false)
    }
  }

  if (pushDone || (profileStatus?.complete && !profileStatus.push_subscribed)) {
    return (
      <div className="student-auth">
        <div className="student-auth__card student-auth__card--wide coach-setup__done">
          <img className="student-auth__logo" src={activationLogo} alt="Berich" />
          <h1>¡Listo!</h1>
          {pushDone ? (
            <p>
              Guardamos tu perfil y activamos las notificaciones. Te vamos a acompañar con recordatorios
              personalizados según tu plan.
            </p>
          ) : (
            <p>
              Guardamos tu perfil. Activá las notificaciones del navegador para recibir recordatorios
              personalizados.
            </p>
          )}

          <Link className="student-auth__button coach-setup__wa-button" to="/programa">
            Ir al programa
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="student-auth">
      <form className="student-auth__card student-auth__card--wide coach-setup" onSubmit={onSubmit}>
        <img className="student-auth__logo" src={activationLogo} alt="Berich" />
        <h1>Tu acompañamiento personalizado</h1>
        <p>Contanos cómo vas a entrenar y activá las notificaciones para recibir recordatorios.</p>

        <div className="student-auth__field">
          <span className="coach-setup__label">¿Qué días vas a entrenar?</span>
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
          <span className="coach-setup__label">¿Cuánta actividad física hacés por semana?</span>
          <div className="coach-setup__options">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={
                  'coach-setup__option' + (activityLevel === opt.value ? ' coach-setup__option--on' : '')
                }
                onClick={() => setActivityLevel(opt.value)}
                disabled={busy}
                aria-pressed={activityLevel === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="coach-setup__whatsapp-block">
          <p className="coach-setup__whatsapp-title">Último paso: notificaciones</p>
          <p className="coach-setup__whatsapp-hint">
            Al continuar, tu navegador te va a pedir permiso para enviarte recordatorios de agua, calorías, pasos y
            días de entrenamiento según tu perfil.
          </p>

          <details className="coach-setup__ios-tip">
            <summary>¿Tenés iPhone? Leé esto antes de activar</summary>
            <ol>
              <li>En Safari, tocá Compartir (cuadrado con flecha).</li>
              <li>Elegí <strong>Agregar a inicio</strong>.</li>
              <li>Abrí el programa desde el ícono Berich en tu pantalla de inicio.</li>
              <li>Volvé acá y activá las notificaciones.</li>
            </ol>
            <p className="coach-setup__ios-tip-note">
              En iPhone las notificaciones solo funcionan si entrás desde el ícono de la pantalla de inicio, no desde
              Safari normal.
            </p>
          </details>

          <label className="coach-setup__opt-in">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} disabled={busy} />
            <span>Acepto recibir notificaciones de acompañamiento del Programa Berich.</span>
          </label>
        </div>

        {error ? <div className="student-auth__error">{error}</div> : null}

        <div className="student-auth__actions">
          <button type="submit" className="student-auth__button coach-setup__wa-button" disabled={busy}>
            {busy ? 'Activando…' : 'Activar notificaciones'}
          </button>
        </div>
      </form>
    </div>
  )
}
