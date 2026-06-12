import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
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

type ProfileStatus = {
  complete?: boolean
  phone_linked?: boolean
  setup_ref?: string
}

const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, '')

function buildWhatsAppUrl(setupRef: string): string | null {
  if (!WHATSAPP_NUMBER) return null
  const text = encodeURIComponent(
    `Hola, acabo de entrar al Programa Berich y quiero activar mi acompañamiento. Ref: ${setupRef}`,
  )
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
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
  const [setupRef, setSetupRef] = useState<string | null>(null)
  const [whatsappDone, setWhatsappDone] = useState(false)

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
          if (body.setup_ref) setSetupRef(body.setup_ref)
          if (body.complete && body.phone_linked) setWhatsappDone(true)
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

  if (profileStatus?.complete && profileStatus.phone_linked) {
    return <Navigate to="/programa" replace />
  }

  function toggleDay(day: number) {
    setTrainingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function openWhatsApp(ref: string) {
    const url = buildWhatsAppUrl(ref)
    if (!url) {
      setError('WhatsApp no está configurado todavía. Avisale al equipo.')
      return false
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!supabase || !session) return

    if (!optIn) {
      setError('Tenés que aceptar recibir mensajes por WhatsApp.')
      return
    }

    if (trainingDays.length < 1) {
      setError('Elegí al menos un día de entrenamiento.')
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
          training_days: trainingDays,
          activity_level: activityLevel,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Montevideo',
          opt_in: true,
        }),
      })

      const body = (await res.json()) as { error?: string; setup_ref?: string }
      if (!res.ok) {
        setError(body.error ?? 'No se pudo guardar tu perfil.')
        setBusy(false)
        return
      }

      const ref = body.setup_ref ?? setupRef
      if (!ref) {
        setError('No se pudo preparar el enlace de WhatsApp.')
        setBusy(false)
        return
      }

      setSetupRef(ref)
      setProfileStatus({ complete: true, phone_linked: false, setup_ref: ref })

      if (openWhatsApp(ref)) {
        setWhatsappDone(true)
      }
      setBusy(false)
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setBusy(false)
    }
  }

  if (whatsappDone || (profileStatus?.complete && !profileStatus.phone_linked)) {
    const ref = setupRef ?? profileStatus?.setup_ref
    const waUrl = ref ? buildWhatsAppUrl(ref) : null

    return (
      <div className="student-auth">
        <div className="student-auth__card student-auth__card--wide coach-setup__done">
          <img className="student-auth__logo" src={activationLogo} alt="Berich" />
          <h1>¡Casi listo!</h1>
          <p>
            Guardamos tu perfil. Ahora escribinos por WhatsApp para activar el acompañamiento — te vamos a responder
            desde ahí.
          </p>

          {waUrl ? (
            <a className="student-auth__button coach-setup__wa-button" href={waUrl} target="_blank" rel="noopener noreferrer">
              Abrir WhatsApp
            </a>
          ) : (
            <p className="coach-setup__wa-missing">Falta configurar el número de WhatsApp del programa.</p>
          )}

          <Link className="coach-setup__program-link" to="/programa">
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
        <p>Contanos cómo vas a entrenar y después activá el seguimiento por WhatsApp.</p>

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
          <p className="coach-setup__whatsapp-title">Último paso: WhatsApp</p>
          <p className="coach-setup__whatsapp-hint">
            Al tocar el botón se abre WhatsApp con un mensaje listo para enviar. Así vinculamos tu número y podemos
            escribirte con recordatorios personalizados.
          </p>

          <label className="coach-setup__opt-in">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} disabled={busy} />
            <span>Acepto recibir mensajes de acompañamiento del Programa Berich por WhatsApp.</span>
          </label>
        </div>

        {error ? <div className="student-auth__error">{error}</div> : null}

        <div className="student-auth__actions">
          <button type="submit" className="student-auth__button coach-setup__wa-button" disabled={busy}>
            {busy ? 'Guardando…' : 'Activar por WhatsApp'}
          </button>
        </div>
      </form>
    </div>
  )
}
