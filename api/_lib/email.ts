export async function sendProgramInviteEmail(params: { to: string; inviteUrl: string; productLabel: string }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'Berich <onboarding@resend.dev>'

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
        <p>Hola,</p>
        <p>Gracias por tu compra. Para ver el programa online, creá tu cuenta con este link (es personal y vence en unos días):</p>
        <p><a href="${params.inviteUrl}">${params.inviteUrl}</a></p>
        <p>Si el botón no funciona, copiá y pegá el link en el navegador.</p>
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
