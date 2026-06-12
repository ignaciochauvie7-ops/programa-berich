import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import activationLogo from '../../supabase/IMG_3353.jpg'
import './student.css'

type ConfirmState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; email: string; mailSent: boolean }
  | { status: 'error'; message: string }

export function PurchaseSuccessPage() {
  const [searchParams] = useSearchParams()
  const checkoutId = searchParams.get('checkout_id')?.trim() ?? ''
  const [confirm, setConfirm] = useState<ConfirmState>({ status: 'idle' })
  const [resendEmail, setResendEmail] = useState('')
  const [resendBusy, setResendBusy] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (!checkoutId) {
      setConfirm({ status: 'idle' })
      return
    }

    let cancelled = false
    setConfirm({ status: 'loading' })

    void (async () => {
      try {
        const res = await fetch('/api/polar/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkout_id: checkoutId }),
        })
        const body = (await res.json()) as {
          error?: string
          email?: string
          mail_sent?: boolean
        }

        if (cancelled) return

        if (!res.ok) {
          setConfirm({ status: 'error', message: body.error ?? 'No se pudo confirmar la compra.' })
          return
        }

        const email = body.email ?? ''
        if (email) setResendEmail(email)
        setConfirm({
          status: 'done',
          email,
          mailSent: body.mail_sent !== false,
        })
      } catch {
        if (!cancelled) {
          setConfirm({ status: 'error', message: 'Error de red. Recargá la página en unos segundos.' })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [checkoutId])

  async function onResend(e: FormEvent) {
    e.preventDefault()
    setResendError(null)
    setResendMessage(null)
    setResendBusy(true)

    try {
      const res = await fetch('/api/polar/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail.trim() }),
      })
      const body = (await res.json()) as { error?: string; mail_sent?: boolean }
      if (!res.ok) {
        setResendError(body.error ?? 'No se pudo reenviar el mail.')
        setResendBusy(false)
        return
      }
      setResendMessage(
        body.mail_sent
          ? 'Listo, te reenviamos el mail de activación. Revisá bandeja y spam.'
          : 'Registramos tu compra pero el mail no salió. Contactanos si no llega en unos minutos.',
      )
    } catch {
      setResendError('Error de red. Intentá de nuevo.')
    }
    setResendBusy(false)
  }

  return (
    <div className="student-auth">
      <div className="student-auth__card student-auth__card--wide">
        <img className="student-auth__logo" src={activationLogo} alt="Berich" />
        <h1>¡Gracias por tu compra!</h1>

        {confirm.status === 'loading' ? (
          <p>Confirmando tu pago y preparando tu acceso…</p>
        ) : null}

        {confirm.status === 'done' ? (
          <>
            <p className="student-auth__success">
              {confirm.mailSent ? (
                <>
                  Te enviamos un mail de activación a <strong>{confirm.email}</strong>. Abrí el link para crear tu
                  contraseña e ingresar al programa.
                </>
              ) : (
                <>
                  Tu compra quedó registrada para <strong>{confirm.email}</strong>, pero el mail no salió. Usá el
                  formulario de abajo para reenviarlo.
                </>
              )}
            </p>
            <p className="student-auth__hint">
              Revisá también la carpeta de spam. El remitente es <strong>hola@programaberich.fit</strong>.
            </p>
          </>
        ) : null}

        {confirm.status === 'error' ? (
          <p className="student-auth__error">{confirm.message}</p>
        ) : null}

        {!checkoutId || confirm.status === 'error' ? (
          <p>
            Si ya pagaste, ingresá el mail que usaste en la compra y te reenviamos la invitación para crear tu
            contraseña.
          </p>
        ) : null}

        <form className="purchase-success__resend" onSubmit={onResend}>
          <div className="student-auth__field">
            <label htmlFor="resend-email">Mail de la compra</label>
            <input
              id="resend-email"
              type="email"
              inputMode="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="tu@mail.com"
              required
              disabled={resendBusy || confirm.status === 'loading'}
            />
          </div>
          {resendError ? <div className="student-auth__error">{resendError}</div> : null}
          {resendMessage ? <p className="student-auth__success">{resendMessage}</p> : null}
          <div className="student-auth__actions">
            <button type="submit" className="student-auth__button" disabled={resendBusy || confirm.status === 'loading'}>
              {resendBusy ? 'Enviando…' : 'Reenviar mail de activación'}
            </button>
          </div>
        </form>

        <p className="student-auth__hint purchase-success__login-hint">
          ¿Ya creaste tu contraseña? <Link to="/login">Ingresar al programa</Link>
        </p>
      </div>
    </div>
  )
}
