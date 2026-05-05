import { useState } from 'react'
import { motion } from 'framer-motion'
import { useFunnelMotion, type FunnelMotionPack } from './funnelMotion'
import type { FunnelStep, GoToMeta } from './types'
import { BodyText } from './BodyText'
import { MediaBlockView } from './MediaBlockView'
import { CtaLink } from './CtaLink'
import { extractYoutubeVideoId, youtubeEmbedSrc } from './youtube'
import { HeightSliderControls, WeightSliderControls } from './HeightWeightSteps'
import { AnalysisLoadingControls } from './AnalysisLoadingControls'
import { PrefinalLoadingControls } from './PrefinalLoadingControls'
import { BerichCloseView } from './BerichCloseView'

type Props = {
  step: FunnelStep
  onGoTo: (stepId: string, meta?: GoToMeta) => void
  /** Si no se pasa (p. ej. preview en el builder), se usa el pack por defecto. */
  motion?: FunnelMotionPack
}

const CENTERED_STEP_IDS = new Set([
  'form_intro',
  'q_sexo',
  'edad_hombre',
  'edad_mujer',
  'altura_hombre',
  'altura_mujer',
  'peso_hombre',
  'peso_mujer',
  'carga_hombre',
  'carga_mujer',
  'objetivo_hombre',
  'objetivo_mujer',
  'impedimento_hombre_musculo',
  'impedimento_hombre_meta',
  'impedimento_mujer_musculo',
  'impedimento_mujer_meta',
  'moneda_hombre_musculo',
  'moneda_hombre_meta',
  'moneda_mujer_musculo',
  'moneda_mujer_meta',
])

export function StepRenderer({ step, onGoTo, motion: motionProp }: Props) {
  const fallbackMotion = useFunnelMotion()
  const m = motionProp ?? fallbackMotion

  if (step.type === 'berich_close') {
    return (
      <motion.article
        className="funnel-step funnel-step--berich-close"
        aria-label="Programa Berich"
        variants={m.outerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={m.blockItem}>
          <BerichCloseView step={step} />
        </motion.div>
      </motion.article>
    )
  }

  const labelledBy = step.headline ? `step-title-${step.id}` : undefined
  const landing =
    step.type === 'video_youtube' ||
    step.type === 'cta_external' ||
    step.type === 'height_slider' ||
    step.type === 'weight_slider' ||
    step.type === 'analysis_loading' ||
    step.type === 'prefinal_loading' ||
    (step.type === 'content' && CENTERED_STEP_IDS.has(step.id)) ||
    (step.type === 'question_single' && CENTERED_STEP_IDS.has(step.id))

  const headlineClass =
    'funnel-headline' +
    (step.type === 'video_youtube' ? ' funnel-headline--hero' : '') +
    (step.type === 'cta_external' || (step.type === 'content' && step.id === 'form_intro')
      ? ' funnel-headline--brand'
      : '')

  return (
    <motion.article
      className={'funnel-step' + (landing ? ' funnel-step--landing' : '')}
      variants={m.outerContainer}
      initial="hidden"
      animate="visible"
      {...(labelledBy
        ? { 'aria-labelledby': labelledBy }
        : { 'aria-label': 'Contenido' })}
    >
      {step.headline ? (
        <motion.h1 id={`step-title-${step.id}`} className={headlineClass} variants={m.blockItem}>
          {step.headline}
        </motion.h1>
      ) : null}
      {step.body?.trim() ? (
        <motion.div className="funnel-body-wrap" variants={m.blockItem}>
          <BodyText text={step.body} />
        </motion.div>
      ) : null}
      {step.media ? (
        <motion.div className="funnel-media-wrap" variants={m.blockItem}>
          <MediaBlockView media={step.media} />
        </motion.div>
      ) : null}
      <motion.div className="funnel-controls-wrap" variants={m.blockItem}>
        <StepControls step={step} onGoTo={onGoTo} m={m} />
      </motion.div>
    </motion.article>
  )
}

function StepControls({
  step,
  onGoTo,
  m,
}: {
  step: FunnelStep
  onGoTo: (stepId: string, meta?: GoToMeta) => void
  m: FunnelMotionPack
}) {
  switch (step.type) {
    case 'content': {
      const variant = step.continueVariant === 'form' ? 'form' : 'primary'
      const btnClass =
        variant === 'form' ? 'funnel-btn funnel-btn--form funnel-btn--link' : 'funnel-btn funnel-btn--primary'
      return (
        <div className={'funnel-actions' + (variant === 'form' ? ' funnel-actions--stack' : '')}>
          <motion.button
            type="button"
            className={btnClass}
            onClick={() => onGoTo(step.nextId)}
            whileTap={m.tap}
            whileHover={m.hover}
          >
            {step.continueLabel ?? 'Continuar'}
          </motion.button>
        </div>
      )
    }
    case 'question_single': {
      const optionGap = step.style?.gap
      const optionsStyle = optionGap !== undefined ? { gap: `${Math.max(0, optionGap)}px` } : undefined
      return (
        <motion.div
          className="funnel-options"
          role="radiogroup"
          aria-label={step.headline ?? 'Opciones'}
          style={{
            ...(optionsStyle ?? {}),
            marginTop: step.style?.topSpace ? `${step.style.topSpace}px` : undefined,
            marginBottom: step.style?.bottomSpace ? `${step.style.bottomSpace}px` : undefined,
          }}
          variants={m.optionsContainer}
          initial="hidden"
          animate="visible"
        >
          {step.options.map((o) => {
            const sexClass =
              o.variant === 'hombre'
                ? ' funnel-option--sex-hombre'
                : o.variant === 'mujer'
                  ? ' funnel-option--sex-mujer'
                  : ''
            const st = step.style?.options?.[o.id]
            return (
              <motion.button
                key={o.id}
                type="button"
                className={'funnel-option' + sexClass}
                style={{
                  background: st?.bg,
                  color: st?.text,
                  borderRadius: st?.radius ? `${st.radius}px` : undefined,
                  fontSize: st?.fontSize ? `${st.fontSize}px` : undefined,
                  paddingTop: st?.paddingY ? `${st.paddingY}px` : undefined,
                  paddingBottom: st?.paddingY ? `${st.paddingY}px` : undefined,
                  paddingLeft: st?.paddingX ? `${st.paddingX}px` : undefined,
                  paddingRight: st?.paddingX ? `${st.paddingX}px` : undefined,
                  width: st?.width ? `${st.width}%` : undefined,
                }}
                variants={m.optionItem}
                onClick={() => onGoTo(o.nextId, o.variant ? { branch: o.variant } : undefined)}
                whileTap={m.tap}
                whileHover={m.hover}
              >
                {o.label}
              </motion.button>
            )
          })}
        </motion.div>
      )
    }
    case 'question_multi':
      return <QuestionMultiControls step={step} onGoTo={onGoTo} m={m} />
    case 'video_youtube':
      return <VideoYoutubeControls step={step} onGoTo={onGoTo} m={m} />
    case 'cta_external':
      return <CtaExternalControls step={step} onGoTo={onGoTo} m={m} />
    case 'outcome':
      return (
        <div className="funnel-actions funnel-actions--stack">
          <CtaLink cta={step.primary} className="funnel-btn funnel-btn--primary funnel-btn--link" />
          {step.secondary ? (
            <CtaLink cta={step.secondary} className="funnel-btn funnel-btn--ghost funnel-btn--link" />
          ) : null}
        </div>
      )
    case 'height_slider':
      return <HeightSliderControls step={step} onGoTo={onGoTo} />
    case 'weight_slider':
      return <WeightSliderControls step={step} onGoTo={onGoTo} />
    case 'analysis_loading':
      return <AnalysisLoadingControls key={step.id} step={step} onGoTo={onGoTo} />
    case 'prefinal_loading':
      return <PrefinalLoadingControls key={step.id} step={step} onGoTo={onGoTo} />
    case 'berich_close':
      return null
    default: {
      const _x: never = step
      void _x
      return null
    }
  }
}

function QuestionMultiControls({
  step,
  onGoTo,
  m,
}: {
  step: Extract<FunnelStep, { type: 'question_multi' }>
  onGoTo: (id: string, meta?: GoToMeta) => void
  m: FunnelMotionPack
}) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set())

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <motion.div
        className="funnel-options funnel-options--multi"
        role="group"
        aria-label={step.headline ?? 'Opciones'}
        variants={m.optionsContainer}
        initial="hidden"
        animate="visible"
      >
        {step.options.map((o) => {
          const on = picked.has(o.id)
          return (
            <motion.button
              key={o.id}
              type="button"
              className={'funnel-option' + (on ? ' funnel-option--on' : '')}
              aria-pressed={on}
              variants={m.optionItem}
              onClick={() => toggle(o.id)}
              whileTap={m.tap}
              whileHover={m.hover}
            >
              {o.label}
            </motion.button>
          )
        })}
      </motion.div>
      <div className="funnel-actions">
        <motion.button
          type="button"
          className="funnel-btn funnel-btn--primary"
          disabled={picked.size === 0}
          onClick={() => onGoTo(step.nextId)}
          whileTap={picked.size === 0 ? undefined : m.tap}
          whileHover={picked.size === 0 ? undefined : m.hover}
        >
          {step.continueLabel ?? 'Continuar'}
        </motion.button>
      </div>
    </>
  )
}

function VideoYoutubeControls({
  step,
  onGoTo,
  m,
}: {
  step: Extract<FunnelStep, { type: 'video_youtube' }>
  onGoTo: (id: string, meta?: GoToMeta) => void
  m: FunnelMotionPack
}) {
  const id = extractYoutubeVideoId(step.youtubeUrl)
  return (
    <>
      {id ? (
        <motion.div
          className="funnel-youtube"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={m.block}
        >
          <iframe
            title={step.headline ?? 'Video'}
            src={youtubeEmbedSrc(id, true)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </motion.div>
      ) : (
        <p className="funnel-error">URL de YouTube no válida.</p>
      )}
      <motion.div
        className="funnel-actions funnel-actions--stack"
        variants={m.optionsContainer}
        initial="hidden"
        animate="visible"
      >
        {step.formNextId?.trim() ? (
          <motion.button
            type="button"
            className="funnel-btn funnel-btn--form funnel-btn--link"
            variants={m.optionItem}
            onClick={() => onGoTo(step.formNextId!.trim())}
            whileTap={m.tap}
            whileHover={m.hover}
          >
            {step.formCta.label}
          </motion.button>
        ) : (
          <motion.div variants={m.optionItem}>
            <CtaLink cta={step.formCta} className="funnel-btn funnel-btn--form funnel-btn--link" />
          </motion.div>
        )}
        {step.nextId ? (
          <motion.button
            type="button"
            className="funnel-btn funnel-btn--ghost"
            variants={m.optionItem}
            onClick={() => onGoTo(step.nextId!)}
            whileTap={m.tap}
            whileHover={m.hover}
          >
            {step.continueLabel ?? 'Continuar'}
          </motion.button>
        ) : null}
      </motion.div>
    </>
  )
}

function CtaExternalControls({
  step,
  onGoTo,
  m,
}: {
  step: Extract<FunnelStep, { type: 'cta_external' }>
  onGoTo: (id: string, meta?: GoToMeta) => void
  m: FunnelMotionPack
}) {
  return (
    <motion.div
      className="funnel-actions funnel-actions--stack"
      variants={m.optionsContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={m.optionItem}>
        <CtaLink cta={step.primary} className="funnel-btn funnel-btn--form funnel-btn--link" />
      </motion.div>
      {step.secondary ? (
        <motion.div variants={m.optionItem}>
          <CtaLink cta={step.secondary} className="funnel-btn funnel-btn--ghost funnel-btn--link" />
        </motion.div>
      ) : null}
      {step.nextId ? (
        <motion.button
          type="button"
          className="funnel-btn funnel-btn--text"
          variants={m.optionItem}
          onClick={() => onGoTo(step.nextId!)}
          whileTap={m.tap}
          whileHover={m.hover}
        >
          Continuar sin salir
        </motion.button>
      ) : null}
    </motion.div>
  )
}
