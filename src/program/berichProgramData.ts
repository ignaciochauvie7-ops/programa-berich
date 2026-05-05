export const INTRO_VIDEO_ID = 'cWNZMkgyzB0'

export const module1Videos = [
  { id: '7tMAVMvNMOQ', title: 'Proceso vs resultado' },
  { id: 'sl0ewhx88b0', title: 'Expectativas, comparación' },
  { id: 'T70Mk4nYaDk', title: 'Paciencia, consistencia y balance' },
  { id: 'oSwqkJWYjTU', title: 'Disciplina ≠ motivación' },
]

export const module2Videos = [
  { id: 'AVg9Yj4knWc', title: 'Supervivencia' },
  { id: 'DiOwTSVx9Xk', title: 'Peso / Composición / Progreso' },
  { id: 'AyLv0nMhM5U', title: 'Calorías' },
]

export const module3RoutineVideos = [
  { id: 'mJIVO6FEjG8', title: 'Rutinas Hombres' },
  { id: 'S6XnBwNxVLw', title: 'Rutinas Mujeres' },
]

export const module3ExerciseVideos = [
  { id: 'KnUeLz5C28c', title: 'Introducción Ejercicios' },
  { id: '_QmLsb9Gxo0', title: 'Ejercicios de Pecho' },
  { id: '073yWmQgaaQ', title: 'Ejercicios de Espalda' },
  { id: 'n9Ws7TX50bY', title: 'Ejercicios de Hombros' },
  { id: 'v5sPlDkfdmc', title: 'Ejercicios de Biceps' },
  { id: 'itiexxmgcAA', title: 'Ejercicios de Triceps' },
  { id: 'tWBSdpdqdR4', title: 'Ejercicios de Piernas' },
  { id: 'uH8smkk_7qw', title: 'Ejercicios de Abdomen' },
]

export const module4Videos = [
  { id: 'DXLUYSP-KAY', title: 'Comer según tus Objetivos' },
  { id: 'WaZ6Vc0VD4Q', title: 'Por qué Comer X y no Y' },
  { id: 'izCZ1Fgw9-g', title: 'Macros' },
  { id: '-TpFrPaWwZI', title: 'Manejo del Hambre y Distribución' },
  { id: 'XAjkHS4rxMQ', title: 'Flexibilidad' },
  { id: 'mXLfiBtevg0', title: 'Plantillas y Guías' },
]

export const module5Videos = [
  { id: 'td7LNYgNzAo', title: 'Seguimiento / Ajustes / Contexto' },
  { id: 'CEI_G5fY5Zc', title: 'Vacaciones / Falta de Tiempo / Parar y Volver' },
]

export const module6Videos = [{ id: 'fKNr8ICkIcM', title: 'Errores / Mitos / Creencias que Restan' }]

export const MODULE_LESSON_KEYS: Record<string, readonly string[]> = {
  m0: [`m0:${INTRO_VIDEO_ID}`],
  m1: module1Videos.map((v) => `m1:${v.id}`),
  m2: module2Videos.map((v) => `m2:${v.id}`),
  m3: [
    ...module3ExerciseVideos.map((v) => `m3:3a:${v.id}`),
    ...module3RoutineVideos.map((v) => `m3:3b:${v.id}`),
  ],
  m4: module4Videos.map((v) => `m4:${v.id}`),
  m5: module5Videos.map((v) => `m5:${v.id}`),
  m6: module6Videos.map((v) => `m6:${v.id}`),
}

export const MODULE3_BRANCH_KEYS: Record<'3a' | '3b', readonly string[]> = {
  '3a': module3ExerciseVideos.map((v) => `m3:3a:${v.id}`),
  '3b': module3RoutineVideos.map((v) => `m3:3b:${v.id}`),
}

export type LessonVideo = { id: string; title: string }

export const berichModules = [
  {
    id: 'm0',
    title: 'INTRODUCCIÓN',
    subtitle: '',
    progress: 0,
    coverImage: '/module-covers/modulo-0-introduccion.png',
  },
  {
    id: 'm1',
    title: 'MODULO 1',
    subtitle: 'Mentalidad operativa y expectativas reales',
    progress: 0,
    coverImage: '/module-covers/modulo-1-cerebro.png',
  },
  {
    id: 'm2',
    title: 'MODULO 2',
    subtitle: 'Entender como funciona tu cuerpo (la logica detras de todo)',
    progress: 0,
    coverImage: '/module-covers/modulo-2-adn.png',
  },
  {
    id: 'm3',
    title: 'MODULO 3',
    subtitle: 'Entrenamiento',
    progress: 0,
    coverImage: '/module-covers/modulo-3-bicep-mancuerna.png',
    branches: [
      {
        id: '3a' as const,
        label: 'MODULO 3A - Ejercicios y construccion del entrenamiento',
        coverImage: '/module-covers/modulo-3a-ejercicios.png',
      },
      {
        id: '3b' as const,
        label: 'MODULO 3B - Rutinas en base a tus objetivos',
        coverImage: '/module-covers/modulo-3b-rutinas.png',
      },
    ],
  },
  {
    id: 'm4',
    title: 'MODULO 4',
    subtitle: 'Alimentacion inteligente',
    progress: 0,
    coverImage: '/module-covers/modulo-4-comida.png',
  },
  {
    id: 'm5',
    title: 'MODULO 5',
    subtitle: 'Seguimiento, ajustes y contexto real',
    progress: 0,
    coverImage: '/module-covers/modulo-5-grafica.png',
  },
  {
    id: 'm6',
    title: 'MODULO 6',
    subtitle: 'Errores / Mitos / Creencias que restan',
    progress: 0,
    coverImage: '/module-covers/modulo-6-alerta.png',
  },
] as const

export function buildLessonKey(moduleId: string, section: '3a' | '3b' | null, videoId: string): string {
  if (moduleId === 'm3' && section) return `m3:${section}:${videoId}`
  return `${moduleId}:${videoId}`
}

/** Slug en URL del programa de alumnos (debe coincidir con `product_slug` en Supabase). */
export const BERICH_PROGRAM_SLUG = 'berich-completo'
