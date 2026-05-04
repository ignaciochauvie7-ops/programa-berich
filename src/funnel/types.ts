/** Declarative funnel graph loaded from JSON (public/funnels/*.json). */

export type FunnelBranch = 'hombre' | 'mujer'

export type GoToMeta = { branch?: FunnelBranch }

export type MediaBlock =
  | { kind: 'image'; src: string; alt?: string }
  | { kind: 'video'; src: string; poster?: string }

export type CtaButton = {
  label: string
  href: string
  /** default true: opens in same tab */
  sameTab?: boolean
}

export type StepBase = {
  id: string
  headline?: string
  /** Plain text or minimal HTML escaped by React — use \\n for breaks */
  body?: string
  media?: MediaBlock
}

export type ContentStep = StepBase & {
  type: 'content'
  nextId: string
  continueLabel?: string
  /** default primary; form = mismo estilo verde CTA principal */
  continueVariant?: 'primary' | 'form'
}

export type QuestionSingleOption = {
  id: string
  label: string
  nextId: string
  /** hombre | mujer: estilo de tarjeta + al elegir fija la paleta del embudo */
  variant?: 'hombre' | 'mujer'
}

export type QuestionSingleStep = StepBase & {
  type: 'question_single'
  options: QuestionSingleOption[]
}

export type QuestionMultiStep = StepBase & {
  type: 'question_multi'
  options: { id: string; label: string }[]
  /** After user confirms selection */
  nextId: string
  continueLabel?: string
}

export type VideoYoutubeStep = StepBase & {
  type: 'video_youtube'
  /** URL del video (watch, youtu.be o embed) */
  youtubeUrl: string
  /** Texto del botón bajo el video */
  formCta: CtaButton
  /** Si está definido, el botón avanza a este paso dentro del embudo (sin usar formCta.href) */
  formNextId?: string
  /** Si más adelante sumás otra pantalla en el mismo embudo */
  nextId?: string
  continueLabel?: string
}

export type CtaExternalStep = StepBase & {
  type: 'cta_external'
  primary: CtaButton
  secondary?: CtaButton
  /** Optional internal next step (e.g. "volver al inicio") */
  nextId?: string
}

export type OutcomeStep = StepBase & {
  type: 'outcome'
  primary: CtaButton
  secondary?: CtaButton
}

/** Deslizador horizontal de altura (cm interno; vista cm / ft). */
export type HeightSliderStep = StepBase & {
  type: 'height_slider'
  minCm: number
  maxCm: number
  defaultCm: number
  nextId: string
  continueLabel?: string
}

/** Deslizador horizontal de peso (kg interno; vista kg / lb). */
export type WeightSliderStep = StepBase & {
  type: 'weight_slider'
  minKg: number
  maxKg: number
  defaultKg: number
  nextId: string
  continueLabel?: string
}

/** Pantalla de análisis: barras 0–100% por fase + carrusel de imágenes (opcional). */
export type AnalysisLoadingPhase = {
  title: string
  subtitle?: string
  /** Peso relativo del segmento (default 1 por fase). */
  weight?: number
}

export type AnalysisLoadingStep = StepBase & {
  type: 'analysis_loading'
  nextId: string
  /** Duración total hasta avanzar solo (default 4800). */
  durationMs?: number
  /** Una barra por fase; cada una llega al 100% en su tramo temporal. */
  phases: AnalysisLoadingPhase[]
  /** URLs de antes/después; si está vacío se muestran placeholders. */
  showcaseImages?: { src: string; alt?: string }[]
}

/** Carga previa al outcome: barra entre progressStart y progressEnd + checks en secuencia. */
export type PrefinalLoadingStep = StepBase & {
  type: 'prefinal_loading'
  nextId: string
  durationMs?: number
  progressStart: number
  progressEnd: number
  checks: string[]
}

export type BerichClosePlan = {
  name: string
  priceUyu: string
  priceUsd: string
  bullets: string[]
  ctaLabel: string
  ctaHref: string
  badge?: string
  whatsappExtra?: string
}

export type BerichCloseFaqItem = {
  question: string
  answer: string
}

/** Pantalla final de oferta: videos, imagen, planes duplicados, grilla FAQ. */
export type BerichCloseStep = StepBase & {
  type: 'berich_close'
  currency: 'uyu' | 'usd'
  videoIntroUrl: string
  videoInsideUrl: string
  highlightImage: { src: string; alt?: string }
  basicPlan: BerichClosePlan
  plusPlan: BerichClosePlan & { badge: string; whatsappExtra: string }
  transformations: { src: string; alt?: string }[]
  faq: BerichCloseFaqItem[]
}

export type FunnelStep =
  | ContentStep
  | QuestionSingleStep
  | QuestionMultiStep
  | VideoYoutubeStep
  | CtaExternalStep
  | OutcomeStep
  | HeightSliderStep
  | WeightSliderStep
  | AnalysisLoadingStep
  | PrefinalLoadingStep
  | BerichCloseStep

export type FunnelDefinition = {
  id: string
  slug: string
  title: string
  startStepId: string
  steps: FunnelStep[]
  /** Optional accent for CSS variables */
  theme?: {
    accent?: string
    accentSoft?: string
    background?: string
  }
}
