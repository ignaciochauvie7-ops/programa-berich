import type {
  BerichClosePlan,
  FunnelBranch,
  FunnelDefinition,
  FunnelStep,
  MediaBlock,
} from './types'

export class FunnelValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FunnelValidationError'
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function reqString(obj: Record<string, unknown>, key: string, ctx: string): string {
  const v = obj[key]
  if (typeof v !== 'string' || !v.trim()) {
    throw new FunnelValidationError(`${ctx}: missing or invalid string "${key}"`)
  }
  return v.trim()
}

function reqNumber(obj: Record<string, unknown>, key: string, ctx: string): number {
  const v = obj[key]
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new FunnelValidationError(`${ctx}: "${key}" must be a finite number`)
  }
  return v
}

function optNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key]
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new FunnelValidationError(`Invalid optional number "${key}"`)
  }
  return v
}

function optString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') {
    throw new FunnelValidationError(`Invalid optional string "${key}"`)
  }
  return v
}

function parseMedia(raw: unknown, ctx: string): MediaBlock | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!isRecord(raw)) throw new FunnelValidationError(`${ctx}: media must be object`)
  const kind = raw.kind
  if (kind === 'image') {
    return {
      kind: 'image',
      src: reqString(raw, 'src', `${ctx}.media`),
      alt: optString(raw, 'alt'),
    }
  }
  if (kind === 'video') {
    return {
      kind: 'video',
      src: reqString(raw, 'src', `${ctx}.media`),
      poster: optString(raw, 'poster'),
    }
  }
  throw new FunnelValidationError(`${ctx}.media: kind must be "image" or "video"`)
}

function parseCtaButton(raw: unknown, ctx: string) {
  if (!isRecord(raw)) throw new FunnelValidationError(`${ctx}: CTA must be object`)
  return {
    label: reqString(raw, 'label', ctx),
    href: reqString(raw, 'href', ctx),
    sameTab: raw.sameTab === true,
  }
}

function parseNonEmptyStringArray(raw: unknown, ctx: string): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new FunnelValidationError(`${ctx}: must be a non-empty array of strings`)
  }
  return raw.map((item, i) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new FunnelValidationError(`${ctx}[${i}]: expected non-empty string`)
    }
    return item.trim()
  })
}

function parseBerichPlanBasic(raw: unknown, ctx: string): BerichClosePlan {
  if (!isRecord(raw)) throw new FunnelValidationError(`${ctx}: plan must be object`)
  return {
    name: reqString(raw, 'name', ctx),
    priceUyu: reqString(raw, 'priceUyu', ctx),
    priceUsd: reqString(raw, 'priceUsd', ctx),
    bullets: parseNonEmptyStringArray(raw.bullets, `${ctx}.bullets`),
    ctaLabel: reqString(raw, 'ctaLabel', ctx),
    ctaHref: reqString(raw, 'ctaHref', ctx),
  }
}

function parseBerichPlanPlus(raw: unknown, ctx: string): BerichClosePlan & {
  badge: string
  whatsappExtra: string
} {
  if (!isRecord(raw)) throw new FunnelValidationError(`${ctx}: plan must be object`)
  const base = parseBerichPlanBasic(raw, ctx)
  return {
    ...base,
    badge: reqString(raw, 'badge', ctx),
    whatsappExtra: reqString(raw, 'whatsappExtra', ctx),
  }
}

function parseStep(raw: unknown, index: number): FunnelStep {
  const ctx = `steps[${index}]`
  if (!isRecord(raw)) throw new FunnelValidationError(`${ctx}: step must be object`)
  const id = reqString(raw, 'id', ctx)
  const type = reqString(raw, 'type', ctx) as FunnelStep['type']
  const base = {
    id,
    headline: optString(raw, 'headline'),
    body: optString(raw, 'body'),
    media: raw.media !== undefined ? parseMedia(raw.media, ctx) : undefined,
  }

  switch (type) {
    case 'content': {
      const cv = optString(raw, 'continueVariant')
      let continueVariant: 'primary' | 'form' | undefined
      if (cv === 'form' || cv === 'primary') continueVariant = cv
      else if (cv !== undefined) {
        throw new FunnelValidationError(`${ctx}: continueVariant must be "primary" or "form"`)
      }
      return {
        ...base,
        type: 'content',
        nextId: reqString(raw, 'nextId', ctx),
        continueLabel: optString(raw, 'continueLabel'),
        continueVariant,
      }
    }
    case 'question_single': {
      const opts = raw.options
      if (!Array.isArray(opts) || opts.length === 0) {
        throw new FunnelValidationError(`${ctx}: question_single needs options[]`)
      }
      const options = opts.map((o, i) => {
        if (!isRecord(o)) throw new FunnelValidationError(`${ctx}.options[${i}]`)
        const vRaw = optString(o, 'variant')
        let variant: FunnelBranch | undefined
        if (vRaw === 'hombre' || vRaw === 'mujer') variant = vRaw
        else if (vRaw !== undefined) {
          throw new FunnelValidationError(`${ctx}.options[${i}].variant must be "hombre" or "mujer"`)
        }
        return {
          id: reqString(o, 'id', `${ctx}.options[${i}]`),
          label: reqString(o, 'label', `${ctx}.options[${i}]`),
          nextId: reqString(o, 'nextId', `${ctx}.options[${i}]`),
          variant,
        }
      })
      let style:
        | {
            gap?: number
            topSpace?: number
            bottomSpace?: number
            options?: Record<
              string,
              {
                bg?: string
                text?: string
                radius?: number
                fontSize?: number
                paddingY?: number
                paddingX?: number
                width?: number
              }
            >
          }
        | undefined
      if (raw.style !== undefined && raw.style !== null) {
        if (!isRecord(raw.style)) throw new FunnelValidationError(`${ctx}.style must be object`)
        style = {
          gap: optNumber(raw.style, 'gap'),
          topSpace: optNumber(raw.style, 'topSpace'),
          bottomSpace: optNumber(raw.style, 'bottomSpace'),
        }
        if (raw.style.options !== undefined && raw.style.options !== null) {
          if (!isRecord(raw.style.options)) {
            throw new FunnelValidationError(`${ctx}.style.options must be object`)
          }
          const perOption: Record<
            string,
            {
              bg?: string
              text?: string
              radius?: number
              fontSize?: number
              paddingY?: number
              paddingX?: number
              width?: number
            }
          > = {}
          for (const [key, value] of Object.entries(raw.style.options)) {
            if (!isRecord(value)) throw new FunnelValidationError(`${ctx}.style.options.${key} must be object`)
            perOption[key] = {
              bg: optString(value, 'bg'),
              text: optString(value, 'text'),
              radius: optNumber(value, 'radius'),
              fontSize: optNumber(value, 'fontSize'),
              paddingY: optNumber(value, 'paddingY'),
              paddingX: optNumber(value, 'paddingX'),
              width: optNumber(value, 'width'),
            }
          }
          style.options = perOption
        }
      }
      return { ...base, type: 'question_single', options, style }
    }
    case 'question_multi': {
      const opts = raw.options
      if (!Array.isArray(opts) || opts.length === 0) {
        throw new FunnelValidationError(`${ctx}: question_multi needs options[]`)
      }
      const options = opts.map((o, i) => {
        if (!isRecord(o)) throw new FunnelValidationError(`${ctx}.options[${i}]`)
        return {
          id: reqString(o, 'id', `${ctx}.options[${i}]`),
          label: reqString(o, 'label', `${ctx}.options[${i}]`),
        }
      })
      return {
        ...base,
        type: 'question_multi',
        options,
        nextId: reqString(raw, 'nextId', ctx),
        continueLabel: optString(raw, 'continueLabel'),
      }
    }
    case 'video_youtube': {
      if (!isRecord(raw.formCta)) {
        throw new FunnelValidationError(`${ctx}: video_youtube needs formCta`)
      }
      const formNextIdRaw = optString(raw, 'formNextId')?.trim()
      const formNextId = formNextIdRaw ? formNextIdRaw : undefined
      const formCtaRaw = raw.formCta
      const formLabel = reqString(formCtaRaw, 'label', `${ctx}.formCta`)
      const formHref = optString(formCtaRaw, 'href')
      if (!formNextId && !formHref) {
        throw new FunnelValidationError(
          `${ctx}: define formCta.href o formNextId para el botón bajo el video`,
        )
      }
      const formCta = {
        label: formLabel,
        href: formHref ?? '#',
        sameTab: formCtaRaw.sameTab === true,
      }
      return {
        ...base,
        type: 'video_youtube',
        youtubeUrl: reqString(raw, 'youtubeUrl', ctx),
        formCta,
        formNextId,
        nextId: optString(raw, 'nextId'),
        continueLabel: optString(raw, 'continueLabel'),
      }
    }
    case 'cta_external': {
      if (!isRecord(raw.primary)) {
        throw new FunnelValidationError(`${ctx}: cta_external needs primary`)
      }
      const primary = parseCtaButton(raw.primary, `${ctx}.primary`)
      const secondary =
        raw.secondary !== undefined && raw.secondary !== null
          ? parseCtaButton(raw.secondary, `${ctx}.secondary`)
          : undefined
      return {
        ...base,
        type: 'cta_external',
        primary,
        secondary,
        nextId: optString(raw, 'nextId'),
      }
    }
    case 'outcome': {
      if (!isRecord(raw.primary)) {
        throw new FunnelValidationError(`${ctx}: outcome needs primary`)
      }
      const primary = parseCtaButton(raw.primary, `${ctx}.primary`)
      const secondary =
        raw.secondary !== undefined && raw.secondary !== null
          ? parseCtaButton(raw.secondary, `${ctx}.secondary`)
          : undefined
      return { ...base, type: 'outcome', primary, secondary }
    }
    case 'height_slider': {
      const minCm = reqNumber(raw, 'minCm', ctx)
      const maxCm = reqNumber(raw, 'maxCm', ctx)
      const defaultCm = reqNumber(raw, 'defaultCm', ctx)
      if (minCm >= maxCm) {
        throw new FunnelValidationError(`${ctx}: minCm must be < maxCm`)
      }
      if (defaultCm < minCm || defaultCm > maxCm) {
        throw new FunnelValidationError(`${ctx}: defaultCm must be between minCm and maxCm`)
      }
      return {
        ...base,
        type: 'height_slider',
        minCm,
        maxCm,
        defaultCm,
        nextId: reqString(raw, 'nextId', ctx),
        continueLabel: optString(raw, 'continueLabel'),
      }
    }
    case 'weight_slider': {
      const minKg = reqNumber(raw, 'minKg', ctx)
      const maxKg = reqNumber(raw, 'maxKg', ctx)
      const defaultKg = reqNumber(raw, 'defaultKg', ctx)
      if (minKg >= maxKg) {
        throw new FunnelValidationError(`${ctx}: minKg must be < maxKg`)
      }
      if (defaultKg < minKg || defaultKg > maxKg) {
        throw new FunnelValidationError(`${ctx}: defaultKg must be between minKg and maxKg`)
      }
      return {
        ...base,
        type: 'weight_slider',
        minKg,
        maxKg,
        defaultKg,
        nextId: reqString(raw, 'nextId', ctx),
        continueLabel: optString(raw, 'continueLabel'),
      }
    }
    case 'analysis_loading': {
      const phasesRaw = raw.phases
      if (!Array.isArray(phasesRaw) || phasesRaw.length === 0) {
        throw new FunnelValidationError(`${ctx}: analysis_loading needs non-empty phases[]`)
      }
      const phases = phasesRaw.map((p, i) => {
        if (!isRecord(p)) throw new FunnelValidationError(`${ctx}.phases[${i}]`)
        const title = reqString(p, 'title', `${ctx}.phases[${i}]`)
        const subtitle = optString(p, 'subtitle')
        const w = p.weight
        let weight: number | undefined
        if (w !== undefined && w !== null) {
          if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) {
            throw new FunnelValidationError(`${ctx}.phases[${i}].weight must be a positive number`)
          }
          weight = w
        }
        return { title, subtitle, weight }
      })
      const imgsRaw = raw.showcaseImages
      let showcaseImages: { src: string; alt?: string }[] | undefined
      if (imgsRaw !== undefined && imgsRaw !== null) {
        if (!Array.isArray(imgsRaw)) {
          throw new FunnelValidationError(`${ctx}: showcaseImages must be an array`)
        }
        showcaseImages = imgsRaw.map((im, i) => {
          if (!isRecord(im)) throw new FunnelValidationError(`${ctx}.showcaseImages[${i}]`)
          return {
            src: reqString(im, 'src', `${ctx}.showcaseImages[${i}]`),
            alt: optString(im, 'alt'),
          }
        })
      }
      const durationRaw = raw.durationMs
      let durationMs: number | undefined
      if (durationRaw !== undefined && durationRaw !== null) {
        durationMs = reqNumber(raw, 'durationMs', ctx)
        if (durationMs <= 0) {
          throw new FunnelValidationError(`${ctx}: durationMs must be > 0`)
        }
      }
      return {
        ...base,
        type: 'analysis_loading',
        nextId: reqString(raw, 'nextId', ctx),
        durationMs,
        phases,
        showcaseImages,
      }
    }
    case 'prefinal_loading': {
      const p0 = reqNumber(raw, 'progressStart', ctx)
      const p1 = reqNumber(raw, 'progressEnd', ctx)
      if (p0 < 0 || p0 > 100 || p1 < 0 || p1 > 100) {
        throw new FunnelValidationError(`${ctx}: progressStart/progressEnd must be 0–100`)
      }
      if (p0 > p1) {
        throw new FunnelValidationError(`${ctx}: progressStart must be <= progressEnd`)
      }
      const checksRaw = raw.checks
      if (!Array.isArray(checksRaw) || checksRaw.length === 0) {
        throw new FunnelValidationError(`${ctx}: prefinal_loading needs non-empty checks[]`)
      }
      const checks = checksRaw.map((c, i) => {
        if (typeof c !== 'string' || !c.trim()) {
          throw new FunnelValidationError(`${ctx}.checks[${i}] must be a non-empty string`)
        }
        return c.trim()
      })
      const durationRaw = raw.durationMs
      let durationMs: number | undefined
      if (durationRaw !== undefined && durationRaw !== null) {
        durationMs = reqNumber(raw, 'durationMs', ctx)
        if (durationMs <= 0) {
          throw new FunnelValidationError(`${ctx}: durationMs must be > 0`)
        }
      }
      return {
        ...base,
        type: 'prefinal_loading',
        nextId: reqString(raw, 'nextId', ctx),
        durationMs,
        progressStart: p0,
        progressEnd: p1,
        checks,
      }
    }
    case 'berich_close': {
      const cur = reqString(raw, 'currency', ctx)
      if (cur !== 'uyu' && cur !== 'usd') {
        throw new FunnelValidationError(`${ctx}: currency must be "uyu" or "usd"`)
      }
      const currency = cur as 'uyu' | 'usd'
      if (!isRecord(raw.highlightImage)) {
        throw new FunnelValidationError(`${ctx}: highlightImage must be object`)
      }
      const highlightImage = {
        src: reqString(raw.highlightImage, 'src', `${ctx}.highlightImage`),
        alt: optString(raw.highlightImage, 'alt'),
      }
      const basicPlan = parseBerichPlanBasic(raw.basicPlan, `${ctx}.basicPlan`)
      const plusPlan = parseBerichPlanPlus(raw.plusPlan, `${ctx}.plusPlan`)
      const transformsRaw = raw.transformations
      if (!Array.isArray(transformsRaw) || transformsRaw.length === 0) {
        throw new FunnelValidationError(`${ctx}: transformations must be a non-empty array`)
      }
      const transformations = transformsRaw.map((t, i) => {
        if (!isRecord(t)) throw new FunnelValidationError(`${ctx}.transformations[${i}]`)
        return {
          src: reqString(t, 'src', `${ctx}.transformations[${i}]`),
          alt: optString(t, 'alt'),
        }
      })
      const faqRaw = raw.faq
      if (!Array.isArray(faqRaw) || faqRaw.length === 0) {
        throw new FunnelValidationError(`${ctx}: faq must be a non-empty array`)
      }
      const faq = faqRaw.map((f, i) => {
        if (!isRecord(f)) throw new FunnelValidationError(`${ctx}.faq[${i}]`)
        return {
          question: reqString(f, 'question', `${ctx}.faq[${i}]`),
          answer: reqString(f, 'answer', `${ctx}.faq[${i}]`),
        }
      })
      return {
        ...base,
        type: 'berich_close',
        currency,
        videoIntroUrl: reqString(raw, 'videoIntroUrl', ctx),
        videoInsideUrl: reqString(raw, 'videoInsideUrl', ctx),
        highlightImage,
        basicPlan,
        plusPlan,
        transformations,
        faq,
      }
    }
    default:
      throw new FunnelValidationError(`${ctx}: unknown type "${type}"`)
  }
}

export function parseFunnelDefinition(raw: unknown): FunnelDefinition {
  if (!isRecord(raw)) {
    throw new FunnelValidationError('Root must be an object')
  }
  const id = reqString(raw, 'id', 'root')
  const slug = reqString(raw, 'slug', 'root')
  const title = reqString(raw, 'title', 'root')
  const startStepId = reqString(raw, 'startStepId', 'root')
  const stepsRaw = raw.steps
  if (!Array.isArray(stepsRaw) || stepsRaw.length === 0) {
    throw new FunnelValidationError('steps must be a non-empty array')
  }
  const steps = stepsRaw.map((s, i) => parseStep(s, i))

  let theme: FunnelDefinition['theme']
  if (raw.theme !== undefined && raw.theme !== null) {
    if (!isRecord(raw.theme)) throw new FunnelValidationError('theme must be object')
    theme = {
      accent: optString(raw.theme, 'accent'),
      accentSoft: optString(raw.theme, 'accentSoft'),
      background: optString(raw.theme, 'background'),
    }
  }

  const def: FunnelDefinition = { id, slug, title, startStepId, steps, theme }
  assertGraphIntegrity(def)
  return def
}

export function assertGraphIntegrity(def: FunnelDefinition): void {
  const ids = new Set(def.steps.map((s) => s.id))
  if (!ids.has(def.startStepId)) {
    throw new FunnelValidationError(`startStepId "${def.startStepId}" not found in steps`)
  }
  const ref = (stepId: string, from: string) => {
    if (!ids.has(stepId)) {
      throw new FunnelValidationError(`Invalid nextId "${stepId}" referenced from ${from}`)
    }
  }

  for (const s of def.steps) {
    switch (s.type) {
      case 'content':
        ref(s.nextId, s.id)
        break
      case 'question_single':
        for (const o of s.options) ref(o.nextId, `${s.id}→${o.id}`)
        break
      case 'question_multi':
        ref(s.nextId, s.id)
        break
      case 'video_youtube':
        if (s.nextId) ref(s.nextId, s.id)
        if (s.formNextId) ref(s.formNextId, `${s.id}.formNextId`)
        break
      case 'cta_external':
        if (s.nextId) ref(s.nextId, s.id)
        break
      case 'outcome':
        break
      case 'height_slider':
        ref(s.nextId, s.id)
        break
      case 'weight_slider':
        ref(s.nextId, s.id)
        break
      case 'analysis_loading':
        ref(s.nextId, s.id)
        break
      case 'prefinal_loading':
        ref(s.nextId, s.id)
        break
      case 'berich_close':
        break
      default: {
        const _exhaust: never = s
        void _exhaust
      }
    }
  }
}
