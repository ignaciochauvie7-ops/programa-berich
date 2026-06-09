/**
 * Prueba rápida de Resend (dominio verificado + API key).
 * Uso: npm run test:resend -- tu@mail.com
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0'

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sendProgramInviteEmail } from '../api/_lib/email.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadEnvLocal() {
  const path = join(ROOT, '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvLocal()

const to = process.argv[2]?.trim()
if (!to || !to.includes('@')) {
  console.error('Uso: npm run test:resend -- tu@mail.com')
  process.exit(1)
}

const activationUrl = (process.env.ACTIVATION_PUBLIC_URL ?? 'https://programaberich.fit').replace(/\/$/, '')

const result = await sendProgramInviteEmail({
  to,
  inviteUrl: `${activationUrl}/activar-cuenta?test=1`,
  productLabel: 'Programa Berich Completo',
})

if (result.sent) {
  console.log(`OK: mail de prueba enviado a ${to}`)
  console.log(`Link en el botón: ${activationUrl}/activar-cuenta?test=1`)
  console.log('(Es solo prueba visual; el mail real de compra trae el link de Supabase con token.)')
  process.exit(0)
}

console.error('ERROR:', 'error' in result ? result.error : 'RESEND_API_KEY ausente o dominio sin verificar')
process.exit(1)
