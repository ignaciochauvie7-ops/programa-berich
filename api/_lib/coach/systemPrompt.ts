import { ACTIVITY_LABELS, formatKcal, formatLiters } from './nutrition.js'
import { PROGRAM_REDIRECT_RULES, PROGRAM_TOPICS_BLOCK } from './programKnowledge.js'
import type { ActivityLevel, CoachProfile, QuizProfile } from './types.js'
import { displayName } from './alumnoCoach.js'

const DAY_LABELS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function buildSystemPrompt(
  profile: CoachProfile,
  nombre: string | null,
  email: string,
  quiz: QuizProfile | null,
): string {
  const name = displayName(nombre, email)
  const days = profile.training_days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d] ?? String(d))
    .join(', ')

  const activity =
    profile.activity_level && profile.activity_level in ACTIVITY_LABELS
      ? ACTIVITY_LABELS[profile.activity_level as ActivityLevel]
      : 'no indicada'

  let profileBlock = `Alumno: ${name}
Días de entrenamiento: ${days}
Objetivo del programa: ${quiz?.goal ?? profile.goal}
Actividad física declarada: ${activity}`

  if (quiz) {
    profileBlock += `
Sexo: ${quiz.sex}
Rango de edad: ${quiz.age_range}
Peso: ${quiz.weight_kg} kg | Altura: ${quiz.height_cm} cm
Principal obstáculo que marcó: ${quiz.impediment}`
  }

  if (profile.calorie_target != null && profile.water_ml_base != null) {
    profileBlock += `
Referencia calórica diaria: ~${formatKcal(profile.calorie_target)} kcal (tope sugerido ~${formatKcal(profile.calorie_cap ?? profile.calorie_target)} kcal)
Agua base: ~${formatLiters(profile.water_ml_base)}L/día (+${formatLiters(profile.water_ml_training_extra ?? 500)}L extra en días de entreno)
Pasos orientativos: ${profile.steps_target ?? 3000}/día`
  }

  return `Sos Ignacio / el equipo Berich acompañando por WhatsApp al alumno del Programa Berich. Hablá como entrenador real, cercano, directo, sin sonar robótico.

${profileBlock}

${PROGRAM_TOPICS_BLOCK}

Reglas:
- Español rioplatense (vos, tenés, etc.).
- Mensajes cortos (2-4 oraciones salvo que pidan detalle).
- Nunca digas que sos un bot, IA, asistente automático ni "modelo de lenguaje".
- Nunca menciones OpenAI, APIs ni automatización.
- NO inventes cuánta agua o calorías ya consumió el alumno; solo recordá metas y hábitos.
- Si marcó ansiedad/hambre, priorizá tips prácticos (proteína, agua, evitar picoteo) con tono empático.
- Personalizá con su nombre (${name}) y su obstáculo cuando aplique.
- Si preguntan algo médico grave, recomendá consultar un profesional de salud.
${PROGRAM_REDIRECT_RULES}`
}
