import { webHandler } from '../_lib/webHandler.js'
import { json } from '../_lib/json.js'
import { getRequestUser } from '../_lib/auth.js'
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js'
import { findAlumnoForUser } from '../_lib/coach/alumnoCoach.js'
import { normalizePhoneE164 } from '../_lib/coach/phone.js'
import { isWhatsAppConfigured, sendWhatsAppText } from '../_lib/whatsapp/client.js'
import { displayName } from '../_lib/coach/alumnoCoach.js'

const DEFAULT_GOAL = 'Recomposición corporal'

type Body = {
  phone?: string
  training_days?: number[]
  timezone?: string
  opt_in?: boolean
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { user, error: authError } = await getRequestUser(request)
  if (authError === 'server misconfigured') return json({ error: authError }, 500)
  if (!user?.email || !user.id) return json({ error: 'unauthorized' }, 401)

  let body: Body = {}
  try {
    body = (await request.json()) as Body
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  if (!body.opt_in) {
    return json({ error: 'Tenés que aceptar recibir mensajes por WhatsApp.' }, 400)
  }

  const phone = normalizePhoneE164(String(body.phone ?? ''))
  if (!phone) {
    return json({ error: 'Teléfono inválido. Incluí código de país, ej. +59899123456.' }, 400)
  }

  const trainingDays = (body.training_days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  if (trainingDays.length < 1) {
    return json({ error: 'Elegí al menos un día de entrenamiento.' }, 400)
  }

  const timezone = String(body.timezone ?? 'America/Montevideo').trim() || 'America/Montevideo'

  const admin = getSupabaseAdmin()
  if (!admin) return json({ error: 'server misconfigured' }, 500)

  const alumno = await findAlumnoForUser(admin, user.id, user.email)
  if (!alumno?.activo) {
    return json({ error: 'Tu cuenta no está activa todavía.' }, 403)
  }

  const now = new Date().toISOString()

  const { error: upsertError } = await admin.from('alumno_coach_profile').upsert(
    {
      alumno_id: alumno.id,
      phone_e164: phone,
      timezone,
      training_days: [...new Set(trainingDays)].sort((a, b) => a - b),
      goal: DEFAULT_GOAL,
      opt_in_at: now,
      setup_completed_at: now,
      coach_active: true,
      updated_at: now,
    },
    { onConflict: 'alumno_id' },
  )

  if (upsertError) {
    if (upsertError.code === '23505') {
      return json({ error: 'Ese número de WhatsApp ya está registrado en otra cuenta.' }, 409)
    }
    console.error('[coach enroll]', upsertError)
    return json({ error: 'No se pudo guardar tu perfil.' }, 500)
  }

  if (isWhatsAppConfigured()) {
    const name = displayName(alumno.nombre, alumno.email)
    const welcome = `Hola ${name}, soy tu acompañamiento del Programa Berich. Ya quedó todo listo: te escribo por acá para ayudarte con entrenamiento y alimentación. ¿En qué te puedo dar una mano hoy?`
    const send = await sendWhatsAppText(phone, welcome)
    if (send.ok) {
      await admin.from('coach_messages').insert({
        alumno_id: alumno.id,
        direction: 'outbound',
        message_type: 'text',
        body: welcome,
        wa_message_id: send.messageId,
        status: 'sent',
      })
      await admin
        .from('alumno_coach_profile')
        .update({ last_outbound_at: now, updated_at: now })
        .eq('alumno_id', alumno.id)
    }
  }

  return json({ ok: true })
}

export default webHandler(handler)
