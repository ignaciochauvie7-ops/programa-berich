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

function greeting(name: string, seed: number, isTrainingDay: boolean): string {
  const training = [
    `Hola ${name}, hoy te toca entrenar 💪`,
    `${name}, día de gym — vamos con todo.`,
    `Buen día ${name}. Hoy toca moverte en el gym.`,
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
  ]
  return pickVariant(lines, seed + 1)
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

  if (goal === 'Perder grasa') {
    const lines = evening
      ? [
          `${name}, ojo con la noche: tratá de no pasarte de ${formatKcal(kcalCap)} kcal hoy. Los snacks después de cenar son los que más frenan.`,
          `Referencia del día: ~${formatKcal(kcalTarget)} kcal. Esta noche no te pases de ${formatKcal(kcalCap)}.`,
        ]
      : [
          `${name}, hoy apuntá a ~${formatKcal(kcalTarget)} kcal. Si estás perdiendo grasa, no te pases de ${formatKcal(kcalCap)}.`,
          `Meta de hoy: rondar ${formatKcal(kcalTarget)} kcal sin pasarte de ${formatKcal(kcalCap)}.`,
        ]
    return pickVariant(lines, seed + 2)
  }

  if (goal === 'Ganar músculo') {
    const lines = evening
      ? [
          `${name}, si no llegaste a ${formatKcal(kcalTarget)} kcal, la cena es tu chance. No te quedes cort${suffix} por miedo.`,
          `Para volumen, hoy tratá de cerrar cerca de ${formatKcal(kcalTarget)} kcal. ¿Cómo venís?`,
        ]
      : [
          `${name}, hoy tratá de llegar a ${formatKcal(kcalTarget)} kcal. Para subir músculo tenés que comer de verdad.`,
          `Meta del día: ${formatKcal(kcalTarget)} kcal. Si almorzaste poco, compensá sin drama.`,
        ]
    return pickVariant(lines, seed + 2)
  }

  const lines = [
    `${name}, referencia hoy: ~${formatKcal(kcalTarget)} kcal (tope suave ${formatKcal(kcalCap)}).`,
    `Hoy apuntá a ${formatKcal(kcalTarget)} kcal y mantené el equilibrio.`,
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
  const baseL = formatLiters(waterBase)
  if (isTrainingDay) {
    const totalL = formatLiters(waterBase + waterExtra)
    const lines = [
      `Agua: apuntá a ~${totalL}L hoy (entreno incluido). ¿Ya tomaste un vaso?`,
      `Hidratación: ~${totalL}L con el entreno de hoy. No esperes a tener sed.`,
    ]
    return pickVariant(lines, seed + 3)
  }
  const lines = [
    `Agua: ~${baseL}L hoy según tu peso.`,
    `Tomá agua a lo largo del día — meta ~${baseL}L.`,
  ]
  return pickVariant(lines, seed + 3)
}

function stepsLine(name: string, steps: number, goal: string | null | undefined, seed: number): string | null {
  if (!steps) return null
  const formatted = new Intl.NumberFormat('es-UY').format(steps)
  if (goal === 'Perder grasa') {
    const lines = [
      `Pasos: si podés, apuntá a ${formatted}. Una caminata de 20 min después de comer ayuda.`,
      `¿Saliste a caminar? Con ${formatted} pasos hoy ya sumás para perder grasa.`,
    ]
    return pickVariant(lines, seed + 4)
  }
  const lines = [
    `Movimiento: ${formatted} pasos alcanza — una caminata corta cuenta.`,
    `Si podés, movete un poco hoy (${formatted} pasos es buena referencia).`,
  ]
  return pickVariant(lines, seed + 4)
}

function weekendBlock(name: string, seed: number): string {
  const lines = [
    `Finde ${name}: ¿cómo estuviste esta semana? Venís bien — no la cagues con excesos en las comidas. Un desliz no arruina todo, una noche entera de pizza y alcohol sí.`,
    `${name}, cerramos la semana. Descansá, pero no tires el plan: disfrutá sin pasarte en comida y alcohol.`,
    `Finde ${name}. Llevás buen ritmo; mantenelo sin obsesionarte. Comé bien, no "de más por ser sábado".`,
  ]
  return pickVariant(lines, seed + 5)
}

function impedimentTip(name: string, impediment: string, goal: string, suffix: string, seed: number): string | null {
  const pools: Record<string, string[]> = {
    'Hambre constante y ansiedad': [
      `Tip: ansiedad → agua + proteína (huevo, pollo, yogur) antes de picar dulce.`,
      `Si te agarra ansiedad, caminá 10 min antes de picar algo.`,
    ],
    'No saber qué comer': [
      `Tip: en cada comida proteína + verdura + carbohidrato. Simple.`,
      `Si dudás qué comer, mandame qué tenés en la heladera.`,
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

/** Un solo mensaje por día de recordatorio: personalizado, variado y barato (1 cargo WPP). */
export function buildDailyDigest(ctx: DigestContext): string {
  const { profile, quiz, nombre, isTrainingDay, now } = ctx
  const tz = profile.timezone || 'America/Montevideo'
  const local = localParts(now, tz)
  const seed = digestDayIndex(profile.alumno_id, now, tz)
  const suffix = tuSuffix(quiz?.sex ?? null)
  const goal = quiz?.goal ?? profile.goal
  const impediment = quiz?.impediment ?? ''

  const kcalTarget = profile.calorie_target ?? 0
  const kcalCap = profile.calorie_cap ?? kcalTarget
  const waterBase = profile.water_ml_base ?? 0
  const waterExtra = profile.water_ml_training_extra ?? 500
  const steps = profile.steps_target ?? 3000

  const parts: string[] = []
  parts.push(greeting(nombre, seed, isTrainingDay))

  if (isTrainingDay) {
    parts.push(trainingLine(nombre, suffix, seed))
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

  if (local.day === 6) {
    parts.push(weekendBlock(nombre, seed))
  } else if (local.day === 1 && seed % 2 === 0) {
    parts.push(`Arrancamos semana, ${nombre}. Mantené el ritmo que venías llevando.`)
  }

  if (seed % 4 === 0 && impediment) {
    const tip = impedimentTip(nombre, impediment, goal, suffix, seed)
    if (tip) parts.push(tip)
  }

  const closing = [
    'Vamos con foco hoy.',
    'Dale que hoy suma.',
    'Seguí el plan y vas bien.',
  ]
  parts.push(pickVariant(closing, seed + 7))

  return parts.filter(Boolean).join('\n\n')
}
