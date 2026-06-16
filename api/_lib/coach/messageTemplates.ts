import { formatKcal, formatLiters } from './nutrition.js'
import { digestDayIndex, localParts } from './schedule.js'
import type { CoachProfile, QuizProfile } from './types.js'

type DigestContext = {
  profile: CoachProfile
  quiz: QuizProfile | null
  nombre: string
  isTrainingDay: boolean
  now: Date
}

function tuSuffix(sex: QuizProfile['sex'] | null): string {
  if (sex === 'mujer') return 'a'
  return 'o'
}

function pickVariant<T>(items: T[], seed: number): T {
  return items[seed % items.length]!
}

function formatWaterMl(ml: number): string {
  return `${new Intl.NumberFormat('es-UY').format(ml)} ml`
}

function formatSteps(steps: number): string {
  return new Intl.NumberFormat('es-UY').format(steps)
}

function weeksInProgram(setupCompletedAt: string | null | undefined, now: Date): number {
  if (!setupCompletedAt) return 1
  const start = new Date(setupCompletedAt).getTime()
  if (!Number.isFinite(start)) return 1
  const weeks = Math.floor((now.getTime() - start) / (7 * 86400000)) + 1
  return Math.max(1, weeks)
}

function trainingDaysPerWeek(profile: CoachProfile): number {
  return profile.training_days.length
}

function greeting(name: string, seed: number, isTrainingDay: boolean): string {
  const training = [
    `Hola ${name}, hoy te toca entrenar 💪`,
    `${name}, día de gym — vamos con todo.`,
    `Buen día ${name}. Hoy toca moverte en el gym.`,
    `Hoy es día de entrenamiento ${name}. No lo pienses más, dale.`,
    `Tu yo del futuro te lo va a agradecer. Hoy toca mover el cuerpo, ${name}.`,
    `La diferencia entre quien eras y quien querés ser se construye hoy, ${name}.`,
    `No hace falta que tengas ganas. Hace falta que vayas, ${name}.`,
    `El dolor de entrenar dura 1 hora. El orgullo dura toda la semana.`,
    `${name}, ¿ya entrenaste? El tiempo no vuelve.`,
    `Hoy no es día de excusas. Es día de resultados.`,
  ]
  const rest = [
    `Hola ${name}, ¿cómo arrancás el día?`,
    `Buen día ${name}.`,
    `${name}, te dejo el plan de hoy:`,
    `Hola ${name}, vamos con foco hoy.`,
  ]
  return pickVariant(isTrainingDay ? training : rest, seed)
}

function trainingLine(name: string, suffix: string, seed: number): string {
  const lines = [
    `Hoy te toca entrenar: no importa qué rutina toque, lo importante es ir y hacer algo útil aunque sea 30–40 min.`,
    `Día de entreno: andá al gym aunque estés floj${suffix}. Mejor mitad de sesión que cero.`,
    `Te toca entrenar hoy. Priorizá ir; el detalle del ejercicio lo tenés en el programa.`,
    `Hoy es día de entrenamiento ${name}. No lo pienses más, dale.`,
    `Tu yo del futuro te lo va a agradecer. Hoy toca mover el cuerpo.`,
    `La diferencia entre quien eras y quien querés ser se construye hoy.`,
    `No hace falta que tengas ganas. Hace falta que vayas.`,
    `El dolor de entrenar dura 1 hora. El orgullo dura toda la semana.`,
    `${name}, ¿ya entrenaste? El tiempo no vuelve.`,
    `Hoy no es día de excusas. Es día de resultados.`,
  ]
  return pickVariant(lines, seed + 1)
}

function restDayLine(name: string, seed: number): string {
  const lines = [
    `Hoy es día de descanso, ${name}. Comé bien, dormí bien y dejá que el cuerpo trabaje.`,
    `El descanso no es perder el tiempo. Es donde el músculo crece.`,
    `Hoy el gym descansa. Vos también podés. Pero el agua y la comida, no.`,
    `Recuperación activa: caminá, estirá, hidratate. No hace falta más.`,
    `${name}, día off del gym. Mantené agua y comida en orden igual.`,
  ]
  return pickVariant(lines, seed + 11)
}

function mondayLine(name: string, seed: number): string {
  const lines = [
    `Arrancó la semana. Hoy marcás el tono de los próximos 6 días.`,
    `Lunes. Oportunidad de hacer que esta sea la mejor semana hasta ahora.`,
    `El que arranca fuerte el lunes termina la semana con resultados. Hoy es ese día.`,
    `Nueva semana, misma meta, más experiencia. Dale ${name}.`,
    `Hoy empieza todo otra vez. No lo desperdicies.`,
    `Arrancamos semana, ${name}. Mantené el ritmo que venías llevando.`,
  ]
  return pickVariant(lines, seed + 12)
}

function midweekLine(name: string, day: number, seed: number): string {
  const lines =
    day === 3
      ? [
          `Ya estás en el medio de la semana. Lo más difícil ya pasó.`,
          `Miércoles. El punto donde muchos bajan el ritmo. Vos no, ${name}.`,
          `Mitad de semana, mitad del camino. ¿Cómo vas con tus hábitos?`,
        ]
      : [
          `Jueves: mañana es viernes y esta semana casi la cerrás bien.`,
          `Si llegaste hasta acá con los hábitos, el viernes lo terminás con orgullo.`,
          `${name}, ya casi cerrás la semana. No aflojes hoy.`,
        ]
  return pickVariant(lines, seed + 13)
}

function fridaySaturdayLine(name: string, day: number, seed: number): string {
  const lines =
    day === 5
      ? [
          `El finde empieza hoy. No tires lo que construiste en la semana.`,
          `Podés disfrutar el fin de semana y seguir siendo inteligente con lo que comés. No son opuestos.`,
          `Los resultados se hacen de lunes a lunes. El finde también cuenta.`,
          `Un poco de consciencia este fin de semana y la semana que viene arrancás con todo.`,
        ]
      : [
          `Esta semana laburaste bien. El sábado no borra eso... si no te pasás.`,
          `No tires tu progreso a la basura este fin de semana. Vale más de lo que creés.`,
          `Finde ${name}: ¿cómo estuviste esta semana? Venís bien — no la cagues con excesos en las comidas.`,
          `${name}, cerramos la semana. Descansá, pero no tires el plan: disfrutá sin pasarte.`,
          `Finde ${name}. Llevás buen ritmo; mantenelo sin obsesionarte.`,
        ]
  return pickVariant(lines, seed + 14)
}

function nutritionLine(
  name: string,
  goal: string | null | undefined,
  kcalTarget: number,
  kcalCap: number,
  suffix: string,
  seed: number,
  evening: boolean,
): string | null {
  if (!kcalTarget) return null
  const kcal = formatKcal(kcalTarget)
  const cap = formatKcal(kcalCap)

  const generic = [
    `Tu meta de hoy: ${kcal} kcal. Comés bien hoy, mañana el cuerpo te lo devuelve.`,
    `¿Ya cumpliste tus ${kcal} kcal? No es dieta, es estrategia.`,
    `La nutrición hace el 80% del trabajo. El gym el 20%. Hoy, enfocate en comer bien.`,
    `Sin combustible no hay motor. ${kcal} kcal es lo que necesita tu cuerpo hoy.`,
    `Cocinar hoy = resultados mañana. ¿Tenés lista la comida?`,
  ]

  if (goal === 'Perder grasa') {
    const lines = evening
      ? [
          `${name}, ojo con la noche: tratá de no pasarte de ${cap} kcal hoy. Los snacks después de cenar son los que más frenan.`,
          `Referencia del día: ~${kcal} kcal. Esta noche no te pases de ${cap}.`,
          `¿Ya cumpliste tus ${kcal} kcal? No te pases de ${cap} al cerrar el día.`,
        ]
      : [
          `${name}, hoy apuntá a ~${kcal} kcal. Si estás perdiendo grasa, no te pases de ${cap}.`,
          `Meta de hoy: rondar ${kcal} kcal sin pasarte de ${cap}.`,
          ...generic,
        ]
    return pickVariant(lines, seed + 2)
  }

  if (goal === 'Ganar músculo') {
    const lines = evening
      ? [
          `${name}, si no llegaste a ${kcal} kcal, la cena es tu chance. No te quedes cort${suffix} por miedo.`,
          `Para volumen, hoy tratá de cerrar cerca de ${kcal} kcal. ¿Cómo venís?`,
          `Sin combustible no hay motor. ${kcal} kcal es lo que necesita tu cuerpo hoy.`,
        ]
      : [
          `${name}, hoy tratá de llegar a ${kcal} kcal. Para subir músculo tenés que comer de verdad.`,
          `Meta del día: ${kcal} kcal. Si almorzaste poco, compensá sin drama.`,
          ...generic,
        ]
    return pickVariant(lines, seed + 2)
  }

  const lines = [
    `${name}, referencia hoy: ~${kcal} kcal (tope suave ${cap}).`,
    `Hoy apuntá a ${kcal} kcal y mantené el equilibrio.`,
    ...generic,
  ]
  return pickVariant(lines, seed + 2)
}

function waterLine(
  name: string,
  waterBase: number,
  waterExtra: number,
  isTrainingDay: boolean,
  seed: number,
): string | null {
  if (!waterBase) return null
  const baseMl = waterBase
  const totalMl = isTrainingDay ? waterBase + waterExtra : waterBase
  const baseL = formatLiters(waterBase)
  const totalL = formatLiters(totalMl)
  const totalMlStr = formatWaterMl(totalMl)
  const baseMlStr = formatWaterMl(baseMl)

  if (isTrainingDay) {
    const lines = [
      `Agua: apuntá a ~${totalL}L (${totalMlStr}) hoy con el entreno incluido. ¿Ya tomaste un vaso?`,
      `Hidratación: ~${totalL}L con el entreno de hoy. No esperes a tener sed.`,
      `¿Tomaste agua hoy? Necesitás ${totalMlStr} para rendir al máximo.`,
      `Sin ${totalMlStr} de agua hoy, tus músculos no se recuperan bien. Simple.`,
      `El 70% del rendimiento es hidratación. ¿Ya vas por la mitad de tus ${totalMlStr}?`,
      `Tu cuerpo necesita agua. Hoy la meta es ${totalMlStr} con entreno.`,
    ]
    return pickVariant(lines, seed + 3)
  }

  const lines = [
    `Agua: ~${baseL}L (${baseMlStr}) hoy según tu peso.`,
    `Tomá agua a lo largo del día — meta ~${baseL}L.`,
    `¿Tomaste agua hoy? Necesitás ${baseMlStr} para rendir al máximo.`,
    `Sin ${baseMlStr} de agua hoy, tu recuperación no es la misma.`,
    `El 70% del rendimiento es hidratación. ¿Ya vas por la mitad de tus ${baseMlStr}?`,
    `Tu cuerpo es mayormente agua. Hoy apuntá a ${baseMlStr}. No lo ignores.`,
    `Si tomaste ${baseMlStr} de agua hoy, ya le ganaste a la mayoría.`,
  ]
  return pickVariant(lines, seed + 3)
}

function stepsLine(name: string, steps: number, goal: string | null | undefined, seed: number): string | null {
  if (!steps) return null
  const formatted = formatSteps(steps)
  const lines = [
    `Vas bien con los pasos o todavía tenés margen para llegar a ${formatted}?`,
    `${formatted} pasos al día mantienen el metabolismo activo. Hoy, ¿cómo vas?`,
    `Cada paso cuenta hacia ${formatted}. Escalera en lugar de ascensor hoy.`,
    `Moverse no es solo el gym. ${formatted} pasos diarios hacen la diferencia.`,
    `Movimiento: ${formatted} pasos alcanza — una caminata corta cuenta.`,
    `Si podés, movete un poco hoy (${formatted} pasos es buena referencia).`,
  ]
  if (goal === 'Perder grasa') {
    lines.push(
      `Pasos: si podés, apuntá a ${formatted}. Una caminata de 20 min después de comer ayuda.`,
      `¿Saliste a caminar? Con ${formatted} pasos hoy ya sumás para perder grasa.`,
    )
  }
  return pickVariant(lines, seed + 4)
}

function weeklyWinLine(name: string, profile: CoachProfile, now: Date, seed: number): string | null {
  const weeks = weeksInProgram(profile.setup_completed_at, now)
  const trainDays = trainingDaysPerWeek(profile)
  const lines = [
    `Esta semana tenés ${trainDays} días de entreno en tu plan. Así se construye un cuerpo.`,
    `Ya son ${weeks} semanas en el programa. Lo que hacés importa aunque no lo veas todavía.`,
    `${name}, ${weeks} semanas después y seguís acá. Eso no es suerte, es carácter.`,
    `Llevas ${weeks} semana${weeks === 1 ? '' : 's'} en Berich. El progreso lento sigue siendo progreso.`,
  ]
  return pickVariant(lines, seed + 15)
}

function mindsetLine(name: string, weeks: number, seed: number): string {
  const lines = [
    `Los resultados no llegan poniendo excusas. Llegaste hasta acá, seguí.`,
    `El progreso lento sigue siendo progreso. No te compares, mejoráte.`,
    `El cuerpo que querés no se compra. Se construye con decisiones como la de hoy.`,
    `No necesitás motivación todos los días. Necesitás disciplina. Hoy, hacelo igual.`,
    `El que entrena cuando no tiene ganas es el que llega a donde quiere.`,
    `La persona que eras hace ${weeks} semana${weeks === 1 ? '' : 's'} no entrenaba igual. La de hoy sí.`,
    `Vamos con foco hoy.`,
    `Dale que hoy suma.`,
    `Seguí el plan y vas bien.`,
  ]
  return pickVariant(lines, seed + 16)
}

function impedimentTip(name: string, impediment: string, goal: string, suffix: string, seed: number): string | null {
  const pools: Record<string, string[]> = {
    'Hambre constante y ansiedad': [
      `Tip: ansiedad → agua + proteína (huevo, pollo, yogur) antes de picar dulce.`,
      `Si te agarra ansiedad, caminá 10 min antes de picar algo.`,
    ],
    'No saber qué comer': [
      `Tip: en cada comida proteína + verdura + carbohidrato. Simple.`,
      `Si dudás qué comer, mirá el módulo de nutrición en el programa.`,
    ],
    'Odio hacer dieta': [
      `Tip: no es "dieta", es comer mejor sin pasar hambre.`,
    ],
    'Falta de tiempo': [
      `Tip: bloqueá 3 entrenos como si fueran reuniones — 35 min alcanza.`,
    ],
    'Me cuesta ser constante': [
      `Tip: un día malo no te hace perder; abandonar una semana sí.`,
    ],
    'No sé por dónde empezar': [
      `Tip: 3 entrenos + proteína en cada comida. El resto lo afinamos.`,
    ],
    'Como mucho y no subo de peso': [
      `Tip: si no subís, revisemos kcal reales y progresión en el gym.`,
    ],
    'Entreno pero no crezco': [
      `Tip: suele ser comida o sueño — ¿llegás a tus kcal y dormís 7h+?`,
    ],
    'No noto cambios': [
      `Tip: los cambios tardan; compará en semanas, no en días.`,
    ],
    'No tengo tiempo para entrenar': [
      `Tip: 2–3 sesiones de 35 min + comida bien = progreso real.`,
    ],
  }

  const messages = pools[impediment]
  if (messages?.length) return pickVariant(messages, seed + 6)

  if (goal === 'Perder grasa') {
    return `${name}, mantené foco: comida real, proteína y paciencia.`
  }
  return null
}

/** Un solo mensaje por día: personalizado, variado (máx. 1 push/día). */
export function buildDailyDigest(ctx: DigestContext): string {
  const { profile, quiz, nombre, isTrainingDay, now } = ctx
  const tz = profile.timezone || 'America/Montevideo'
  const local = localParts(now, tz)
  const seed = digestDayIndex(profile.alumno_id, now, tz)
  const suffix = tuSuffix(quiz?.sex ?? null)
  const goal = quiz?.goal ?? profile.goal
  const impediment = quiz?.impediment ?? ''
  const weeks = weeksInProgram(profile.setup_completed_at, now)

  const kcalTarget = profile.calorie_target ?? 0
  const kcalCap = profile.calorie_cap ?? kcalTarget
  const waterBase = profile.water_ml_base ?? 0
  const waterExtra = profile.water_ml_training_extra ?? 500
  const steps = profile.steps_target ?? 3000

  const parts: string[] = []

  if (local.day === 1) {
    parts.push(mondayLine(nombre, seed))
  } else if (local.day === 3 || local.day === 4) {
    parts.push(midweekLine(nombre, local.day, seed))
  } else if (local.day === 5 || local.day === 6) {
    parts.push(fridaySaturdayLine(nombre, local.day, seed))
  } else {
    parts.push(greeting(nombre, seed, isTrainingDay))
  }

  if (isTrainingDay) {
    parts.push(trainingLine(nombre, suffix, seed))
  } else {
    parts.push(restDayLine(nombre, seed))
  }

  const evening = local.hour >= 14
  const nutrition = nutritionLine(nombre, goal, kcalTarget, kcalCap, suffix, seed, evening)
  if (nutrition) parts.push(nutrition)

  const water = waterLine(nombre, waterBase, waterExtra, isTrainingDay, seed)
  if (water) parts.push(water)

  const includeSteps = seed % 3 !== 0 || goal === 'Perder grasa'
  if (includeSteps) {
    const stepsText = stepsLine(nombre, steps, goal, seed)
    if (stepsText) parts.push(stepsText)
  }

  if (seed % 5 === 0) {
    const win = weeklyWinLine(nombre, profile, now, seed)
    if (win) parts.push(win)
  }

  if (seed % 4 === 0 && impediment) {
    const tip = impedimentTip(nombre, impediment, goal, suffix, seed)
    if (tip) parts.push(tip)
  } else if (seed % 3 === 0) {
    parts.push(mindsetLine(nombre, weeks, seed))
  } else {
    parts.push(mindsetLine(nombre, weeks, seed + 7))
  }

  return parts.filter(Boolean).join('\n\n')
}
