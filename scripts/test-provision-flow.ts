/**
 * Prueba el flujo post-compra: Supabase invite link + mail Resend.
 * Uso: npm run test:provision -- tu@mail.com
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0'

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSupabaseAdmin } from '../api/_lib/supabaseAdmin.js'
import { provisionAlumnoInvite } from '../api/_lib/provisionAlumno.js'
import { getActivationOrigin } from '../api/_lib/auth.js'

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

const email = process.argv[2]?.trim()
if (!email || !email.includes('@')) {
  console.error('Uso: npm run test:provision -- tu@mail.com')
  process.exit(1)
}

const admin = getSupabaseAdmin()
if (!admin) {
  console.error('ERROR: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltan en .env.local')
  process.exit(1)
}

console.log('Activation URL:', `${getActivationOrigin()}/activar-cuenta`)
console.log('Probando provisionAlumnoInvite para', email, '...\n')

const result = await provisionAlumnoInvite(admin, email, {
  source: 'test',
  productSlug: process.env.PRODUCT_SLUG ?? 'berich-completo',
  activo: false,
})

if (result.ok === false) {
  console.error('FALLÓ:', result.error)
  process.exit(1)
}

console.log('Alumno:', result.alumno)
console.log('Mail enviado:', result.mailSent ? 'SÍ' : 'NO')

if (!result.mailSent) {
  console.error('\nEl alumno se creó pero el mail NO salió. Revisá RESEND_API_KEY y dominio verificado.')
  process.exit(1)
}

console.log('\nOK: revisá el mail de', email, 'y abrí el link para activar cuenta.')
