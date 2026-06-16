import { useEffect, useState } from 'react'
import {
  isPushSupported,
  registerServiceWorker,
  resubscribeToCoachPush,
  subscribeToCoachPush,
  unsubscribeFromCoachPush,
} from '../lib/pushNotifications'

const IOS_VIDEO_URL = (import.meta.env.VITE_IOS_PUSH_VIDEO_URL as string | undefined)?.trim()

function isLikelyIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

type PushNotificationsPanelProps = {
  accessToken: string
  pushSubscribed: boolean
  variant?: 'setup' | 'profile'
  onSubscribed?: () => void
}

export function PushNotificationsPanel({
  accessToken,
  pushSubscribed,
  variant = 'profile',
  onSubscribed,
}: PushNotificationsPanelProps) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ios = isLikelyIos()
  const standalone = isStandalonePwa()
  const supported = isPushSupported()

  useEffect(() => {
    void registerServiceWorker()
  }, [])

  async function handleActivate(forceNew: boolean) {
    setBusy(true)
    setError(null)
    setMessage(null)

    const result = forceNew
      ? await resubscribeToCoachPush(accessToken)
      : await subscribeToCoachPush(accessToken)

    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'No se pudieron activar las notificaciones.')
      return
    }

    setMessage(
      forceNew
        ? 'Notificaciones reactivadas. Si tenés iPhone, asegurate de haber abierto el programa desde el ícono del inicio.'
        : 'Notificaciones activadas correctamente.',
    )
    onSubscribed?.()
  }

  async function handleDeactivate() {
    const confirmed = window.confirm(
      '¿Desactivar los recordatorios push? Seguís con acceso al programa; solo dejás de recibir avisos de agua, calorías y entrenamiento.',
    )
    if (!confirmed) return

    setBusy(true)
    setError(null)
    setMessage(null)

    const result = await unsubscribeFromCoachPush(accessToken)
    setBusy(false)

    if (!result.ok) {
      setError(result.error ?? 'No se pudieron desactivar las notificaciones.')
      return
    }

    setMessage('Notificaciones desactivadas. Podés volver a activarlas cuando quieras desde acá.')
    onSubscribed?.()
  }

  const showIosWarning = ios && !standalone
  const showReactivate = pushSubscribed && (showIosWarning || variant === 'profile')
  const showDeactivate = pushSubscribed && variant === 'profile'

  return (
    <section
      className={
        'student-profile__card student-profile__card--push' +
        (variant === 'setup' ? ' student-profile__card--push-setup' : '')
      }
    >
      <div className="student-profile__push-header">
        <h2>Notificaciones</h2>
        <span
          className={
            'student-profile__push-badge' +
            (pushSubscribed ? ' student-profile__push-badge--on' : ' student-profile__push-badge--off')
          }
        >
          {pushSubscribed ? 'Activas' : 'Sin activar'}
        </span>
      </div>

      <p className="student-profile__push-lead">
        Recibís recordatorios de agua, calorías, pasos y días de entrenamiento según tu perfil. No necesitás dar tu
        número de teléfono.
      </p>

      {showIosWarning ? (
        <div className="coach-setup__ios-tip coach-setup__ios-tip--open student-profile__ios-tip">
          <p className="student-profile__ios-title">Si tenés iPhone, hacé esto primero</p>
          <ol>
            <li>En Safari, tocá Compartir (cuadrado con flecha).</li>
            <li>Elegí <strong>Agregar a inicio</strong>.</li>
            <li>Cerrá Safari y abrí el programa desde el ícono Berich.</li>
            <li>Volvé acá y tocá {pushSubscribed ? 'Reactivar notificaciones' : 'Activar notificaciones'}.</li>
          </ol>
          {IOS_VIDEO_URL ? (
            <a className="student-profile__video-link" href={IOS_VIDEO_URL} target="_blank" rel="noopener noreferrer">
              Ver video: cómo activar en iPhone
            </a>
          ) : null}
        </div>
      ) : ios && standalone ? (
        <p className="student-profile__push-note student-profile__push-note--ok">
          Abriste el programa desde el ícono del inicio. Podés activar o reactivar las notificaciones acá.
        </p>
      ) : null}

      {!supported ? (
        <p className="student-profile__push-note">
          Tu navegador no soporta notificaciones push. Probá con Chrome o Edge en el celular o la compu.
        </p>
      ) : (
        <div className="student-profile__push-actions">
          {!pushSubscribed ? (
            <button
              type="button"
              className="student-auth__button student-profile__push-button"
              disabled={busy}
              onClick={() => void handleActivate(false)}
            >
              {busy ? 'Activando…' : 'Activar notificaciones'}
            </button>
          ) : null}

          {showReactivate ? (
            <button
              type="button"
              className="student-auth__button student-profile__push-button student-profile__push-button--secondary"
              disabled={busy}
              onClick={() => void handleActivate(true)}
            >
              {busy ? 'Reactivando…' : 'Reactivar notificaciones'}
            </button>
          ) : null}

          {showDeactivate ? (
            <button
              type="button"
              className="student-profile__push-button student-profile__push-button--danger"
              disabled={busy}
              onClick={() => void handleDeactivate()}
            >
              {busy ? 'Desactivando…' : 'Desactivar notificaciones'}
            </button>
          ) : null}
        </div>
      )}

      {pushSubscribed && !showReactivate && !showIosWarning ? (
        <p className="student-profile__push-note student-profile__push-note--ok">
          Las notificaciones están activas en este dispositivo. Si cambiás de celular o navegador, volvé a activarlas
          acá.
        </p>
      ) : null}

      {message ? <p className="student-profile__saved">{message}</p> : null}
      {error ? <div className="student-auth__error student-profile__error">{error}</div> : null}
    </section>
  )
}
