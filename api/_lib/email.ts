const DEFAULT_FROM = 'Programa Berich <hola@programaberich.fit>'

export async function sendProgramInviteEmail(params: { to: string; inviteUrl: string; productLabel: string }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM?.trim() || DEFAULT_FROM

  if (!key) {
    console.warn('[berich] RESEND_API_KEY ausente; mail no enviado. Link:', params.inviteUrl)
    return { sent: false as const }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: `Tu acceso a ${params.productLabel}`,
      html: `
        <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:520px">
          <p>Hola,</p>
          <p>Gracias por tu compra de <strong>${params.productLabel}</strong>.</p>
          <p>Para entrar al programa online, creá tu contraseña con este botón:</p>
          <p style="margin:24px 0">
            <a href="${params.inviteUrl}" style="background:#00e5c3;color:#000;font-weight:700;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
              Crear mi cuenta
            </a>
          </p>
          <p style="font-size:14px;color:#555">Si el botón no funciona, copiá este link en el navegador:</p>
          <p style="font-size:14px;word-break:break-all"><a href="${params.inviteUrl}">${params.inviteUrl}</a></p>
          <p style="font-size:13px;color:#777">El link es personal y vence en unos días.</p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[berich] Resend error', res.status, text)
    return { sent: false as const, error: text }
  }

  return { sent: true as const }
}
