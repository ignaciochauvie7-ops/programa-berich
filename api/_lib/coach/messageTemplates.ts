import { formatKcal, formatLiters } from './nutrition.js'
import type { CoachProfile, ProactiveJobType, QuizProfile } from './types.js'

type BuildContext = {
  profile: CoachProfile
  quiz: QuizProfile | null
  nombre: string
  isTrainingDay: boolean
  dayIndex: number
}

function tuSuffix(sex: QuizProfile['sex'] | null): string {
  if (sex === 'mujer') return 'a'
  return 'o'
}

function pickVariant<T>(items: T[], seed: number): T {
  return items[seed % items.length]!
}

export function buildProactiveText(job: ProactiveJobType, ctx: BuildContext): string {
  const { profile, quiz, nombre, isTrainingDay, dayIndex } = ctx
  const name = nombre
  const suffix = tuSuffix(quiz?.sex ?? null)
  const hasTargets = profile.calorie_target != null && profile.water_ml_base != null

  const kcalTarget = profile.calorie_target ?? 0
  const kcalCap = profile.calorie_cap ?? kcalTarget
  const waterBase = profile.water_ml_base ?? 0
  const waterExtra = profile.water_ml_training_extra ?? 1000
  const steps = profile.steps_target ?? 3000
  const goal = quiz?.goal ?? profile.goal
  const impediment = quiz?.impediment ?? ''

  switch (job) {
    case 'training_reminder':
      if (isTrainingDay) {
        return `Hola ${name}, hoy te toca entrenar 💪 ¿Cómo venís de energía? Si estás floj${suffix}, igual movete aunque sea 30 min, eso también suma.`
      }
      return `Hola ${name}, hoy te toca entrenar. ¿Cómo venís de energía?`

    case 'hydration': {
      if (!hasTargets) {
        return `${name}, andá tomando agua a lo largo del día 💧 No esperes a tener sed.`
      }
      const baseL = formatLiters(waterBase)
      if (isTrainingDay) {
        const totalL = formatLiters(waterBase + waterExtra)
        return `${name}, hoy con entreno apuntá a unos ${totalL}L de agua (${baseL}L base + un litro extra). ¿Ya tomaste un vaso ahora? No hace falta que "lleves cuenta" al milímetro, solo no te olvides.`
      }
      return `${name}, tu meta de agua hoy son unos ${baseL}L (según tu peso). ¿Ya tomaste algo en la mañana? Mandame un ok cuando tomes el primer vaso grande.`
    }

    case 'nutrition_am':
    case 'nutrition': {
      if (!hasTargets) {
        return `${name}, cuidá tus comidas hoy y mantené el ritmo con el plan.`
      }
      if (goal === 'Ganar músculo') {
        return `${name}, hoy tratá de llegar a unas ${formatKcal(kcalTarget)} kcal. ¿Cómo venís con el desayuno y el almuerzo? Si comiste poco, no te quedes cort${suffix}.`
      }
      if (goal === 'Perder grasa') {
        return `${name}, tu referencia hoy ronda las ${formatKcal(kcalTarget)} kcal. ¿Cómo venís con las comidas? Si ya almorzaste, contame qué comiste (sin drama, para orientarte).`
      }
      return `${name}, tu referencia hoy son unas ${formatKcal(kcalTarget)} kcal. ¿Cómo venís con el desayuno y el almuerzo?`
    }

    case 'nutrition_pm': {
      if (!hasTargets) {
        return `${name}, cerrá el día con buenas decisiones en la cena.`
      }
      if (goal === 'Perder grasa') {
        return `${name}, ojo con la noche: tratá de no pasarte de ${formatKcal(kcalCap)} kcal hoy. Esos "mini snacks" después de cenar son los que más te frenan.`
      }
      if (goal === 'Ganar músculo') {
        return `${name}, si todavía no llegaste a ${formatKcal(kcalTarget)} kcal, la cena es tu chance. No te quedes sin comer de más miedo a "pasarte".`
      }
      return `${name}, tratá de cerrar cerca de ${formatKcal(kcalTarget)} kcal hoy sin pasarte de ${formatKcal(kcalCap)}. ¿Qué pensás cenar?`
    }

    case 'steps_reminder': {
      const formatted = new Intl.NumberFormat('es-UY').format(steps)
      if (goal === 'Perder grasa') {
        return `${name}, ¿cómo venís con los pasos hoy? Si podés, apuntá a ${formatted}. Una caminata de 20-30 min después de comer ayuda un montón.`
      }
      return `${name}, ¿saliste a caminar un poco hoy? Con ${formatted} pasos ya estás haciendo algo útil, no hace falta matarte.`
    }

    case 'weekend_boost': {
      const lines = [
        `${name}, venís bien la semana. El finde no es para "tirar todo", es para descansar sin romper el plan.`,
        `Finde ${name}: disfrutá, pero no la cagues con excesos. Un desliz no arruina todo, una noche entera de pizza y alcohol sí.`,
        `${name}, el finde es donde se define la constancia. Venís bien, mantené el ritmo sin obsesionarte.`,
      ]
      return pickVariant(lines, dayIndex)
    }

    case 'impediment_support':
      return buildImpedimentMessage(name, impediment, goal, suffix, dayIndex)

    case 'weekly_check':
      return `¿Cómo venís esta semana, ${name}? Contame entreno, comidas y si algo te está costando más de lo normal.`

    case 'reengagement':
      return `Hola ${name}, hace unos días que no charlamos. ¿Cómo venís con el plan? Si te trabaste en algo, contame y lo vemos.`

    default:
      return `Hola ${name}, ¿cómo venís con el programa?`
  }
}

function buildImpedimentMessage(
  name: string,
  impediment: string,
  goal: string,
  suffix: string,
  dayIndex: number,
): string {
  const pools: Record<string, string[]> = {
    'Hambre constante y ansiedad': [
      `${name}, si te agarra ansiedad: tomá un vaso de agua, respirá 5 veces y comé proteína (huevo, pollo, yogur). Esos mini snacks dulces te matan el progreso.`,
      `${name}, la ansiedad muchas veces es hambre de proteína o de sueño. Antes de picar algo, preguntate: ¿comí bien en la última comida?`,
      `Tip para vos ${name}: cuando sientas ganas de picar, esperá 10 minutos caminando. Si sigue, comé algo con proteína, no galletitas.`,
    ],
    'No saber qué comer': [
      `${name}, simple: en cada comida proteína + verdura + carbohidrato (arroz, papa, avena). Si dudás, mandame qué tenés en la heladera y te digo.`,
      `${name}, no necesitás una dieta perfecta. Necesitás repetir lo mismo: desayuno, almuerzo, merienda, cena. ¿Querés que te arme un esquema básico?`,
    ],
    'Odio hacer dieta': [
      `${name}, olvidate de "dieta". Pensá en comer mejor, no en sufrir. El plan está para que comas, no para que pases hambre.`,
      `${name}, si odiás la dieta es porque probablemente estás comiendo muy poco. Comé más de lo correcto, no menos al azar.`,
    ],
    'Falta de tiempo': [
      `${name}, con 30-40 min de entreno ya contás. No necesitás vivir en el gym. ¿Qué días te quedan más libres esta semana?`,
      `${name}, la falta de tiempo se arregla con prioridad: bloqueá 3 días en la agenda como si fuera una reunión importante.`,
    ],
    'Me cuesta ser constante': [
      `${name}, la constancia no es motivación, es sistema. Marcá 3 días fijos de entreno y cumplilos aunque sea la mitad del tiempo.`,
      `${name}, un día malo no te hace perder. Lo que te hace perder es abandonar una semana entera. Volvé hoy, sin culpa.`,
    ],
    'No sé por dónde empezar': [
      `${name}, empezá por lo básico: 3 entrenos por semana + proteína en cada comida. El resto lo vamos afinando.`,
      `${name}, no necesitás tener todo claro. Seguí el programa paso a paso y preguntame lo que sea.`,
    ],
    'Como mucho y no subo de peso': [
      `${name}, si comés mucho y no subís, probablemente no estás comiendo lo que creés o te falta progresión en el gym. Contame qué comiste hoy.`,
      `${name}, para subir músculo tenés que estar en superávit real. ¿Llegaste a tus kcal hoy o te quedaste cort${suffix}?`,
    ],
    'Entreno pero no crezco': [
      `${name}, si entrenás y no crecés, casi siempre es comida o sueño. ¿Estás durmiendo 7h+ y llegando a tus kcal?`,
      `${name}, en el gym la clave es progresar cargas o repeticiones. ¿Estás anotando lo que levantás?`,
    ],
    'No noto cambios': [
      `${name}, los cambios tardan. Sacate una foto hoy y compará en 4 semanas, no en 4 días.`,
      `${name}, si no ves cambios, revisemos juntos entreno, comida y pasos. A veces es un solo ajuste chico.`,
    ],
    'No tengo tiempo para entrenar': [
      `${name}, con 2-3 entrenos de 35 min alcanza si la comida está bien. ¿Cuál es el día más imposible para vos?`,
    ],
  }

  const messages = pools[impediment]
  if (messages?.length) {
    return pickVariant(messages, dayIndex)
  }

  if (goal === 'Perder grasa') {
    return `${name}, mantené el foco: comida real, proteína y paciencia. Si te trabás, escribime.`
  }

  return `${name}, seguí el plan y contame si algo te está costando. Estoy para ayudarte.`
}
