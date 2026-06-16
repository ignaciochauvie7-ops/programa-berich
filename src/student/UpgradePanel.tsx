import { useState } from 'react'

type TrialStatus = 'active' | 'expiring' | 'expired' | 'subscribed'

type UpgradePanelProps = {
  accessToken: string
  status: TrialStatus
  daysLeft: number | null
  /** 'banner' = compact top bar, 'profile' = full card in Mi perfil */
  variant?: 'banner' | 'profile'
}

export function UpgradePanel({ accessToken, status, daysLeft, variant = 'profile' }: UpgradePanelProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Nothing to show if subscription is active
  if (status === 'subscribed') return null
  // Nothing to show if the trial is well within range
  if (status === 'active') return null

  async function handleUpgrade() {
    setBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/polar/subscribe-checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      const body = (await res.json()) as { checkout_url?: string; error?: string; days_left?: number }

      if (!res.ok || !body.checkout_url) {
        setError(body.error ?? 'No se pudo iniciar el proceso de pago.')
        setBusy(false)
        return
      }

      window.location.href = body.checkout_url
    } catch {
      setError('Error de red. Intentá de nuevo.')
      setBusy(false)
    }
  }

  if (variant === 'banner') {
    return (
      <div className="upgrade-banner">
        <span className="upgrade-banner__text">
          {status === 'expiring'
            ? `Tu acompañamiento vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}.`
            : 'Tu período de acompañamiento gratuito terminó.'}
        </span>
        <button
          type="button"
          className="upgrade-banner__btn"
          disabled={busy}
          onClick={() => void handleUpgrade()}
        >
          {busy ? 'Cargando…' : 'Seguir con acompañamiento →'}
        </button>
        {error ? <p className="upgrade-banner__error">{error}</p> : null}
      </div>
    )
  }

  return (
    <section className="student-profile__card upgrade-panel">
      <div className="upgrade-panel__header">
        <h2>Acompañamiento mensual</h2>
        {status === 'expiring' ? (
          <span className="upgrade-panel__badge upgrade-panel__badge--warn">
            Vence en {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
          </span>
        ) : (
          <span className="upgrade-panel__badge upgrade-panel__badge--off">Período terminado</span>
        )}
      </div>

      <p className="upgrade-panel__desc">
        {status === 'expiring'
          ? `Tu mes de recordatorios gratuitos vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}. Podés suscribirte para seguir recibiendo avisos de agua, calorías, pasos y días de entrenamiento.`
          : 'Tu período gratuito de acompañamiento terminó. Suscribite para volver a recibir tus recordatorios diarios personalizados.'}
      </p>

      <ul className="upgrade-panel__list">
        <li>Recordatorios diarios de agua, calorías y pasos</li>
        <li>Avisos según tus días de entrenamiento</li>
        <li>Mensajes personalizados según tu objetivo</li>
        <li>Cancelás cuando querés</li>
      </ul>

      <button
        type="button"
        className="student-auth__button upgrade-panel__btn"
        disabled={busy}
        onClick={() => void handleUpgrade()}
      >
        {busy ? 'Cargando…' : 'Activar acompañamiento mensual'}
      </button>

      {error ? <div className="student-auth__error" style={{ marginTop: '0.75rem' }}>{error}</div> : null}
    </section>
  )
}
