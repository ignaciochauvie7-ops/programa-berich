import { useState } from 'react'
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

export function StepRenderer({ step, onGoTo }: Props) {
  if (step.type === 'berich_close') {
    return (
      <article className="funnel-step funnel-step--berich-close" aria-label="Programa Berich">
        <BerichCloseView step={step} />
      </article>
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
    <article
      className={'funnel-step' + (landing ? ' funnel-step--landing' : '')}
      {...(labelledBy
        ? { 'aria-labelledby': labelledBy }
        : { 'aria-label': 'Contenido' })}
    >
      {step.headline ? (
        <h1 id={`step-title-${step.id}`} className={headlineClass}>
          {step.headline}
        </h1>
      ) : null}
      <BodyText text={step.body} />
      <MediaBlockView media={step.media} />
      <StepControls step={step} onGoTo={onGoTo} />
    </article>
  )
}

function StepControls({ step, onGoTo }: Props) {
  switch (step.type) {
    case 'content': {
      const variant = step.continueVariant === 'form' ? 'form' : 'primary'
      const btnClass =
        variant === 'form' ? 'funnel-btn funnel-btn--form funnel-btn--link' : 'funnel-btn funnel-btn--primary'
      return (
        <div className={'funnel-actions' + (variant === 'form' ? ' funnel-actions--stack' : '')}>
          <button type="button" className={btnClass} onClick={() => onGoTo(step.nextId)}>
            {step.continueLabel ?? 'Continuar'}
          </button>
        </div>
      )
    }
    case 'question_single':
      return (
        <div className="funnel-options" role="radiogroup" aria-label={step.headline ?? 'Opciones'}>
          {step.options.map((o) => {
            const sexClass =
              o.variant === 'hombre'
                ? ' funnel-option--sex-hombre'
                : o.variant === 'mujer'
                  ? ' funnel-option--sex-mujer'
                  : ''
            return (
              <button
                key={o.id}
                type="button"
                className={'funnel-option' + sexClass}
                onClick={() => onGoTo(o.nextId, o.variant ? { branch: o.variant } : undefined)}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )
    case 'question_multi':
      return <QuestionMultiControls step={step} onGoTo={onGoTo} />
    case 'video_youtube':
      return <VideoYoutubeControls step={step} onGoTo={onGoTo} />
    case 'cta_external':
      return <CtaExternalControls step={step} onGoTo={onGoTo} />
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
}: {
  step: Extract<FunnelStep, { type: 'question_multi' }>
  onGoTo: (id: string, meta?: GoToMeta) => void
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
      <div className="funnel-options funnel-options--multi" role="group" aria-label={step.headline ?? 'Opciones'}>
        {step.options.map((o) => {
          const on = picked.has(o.id)
          return (
            <button
              key={o.id}
              type="button"
              className={'funnel-option' + (on ? ' funnel-option--on' : '')}
              aria-pressed={on}
              onClick={() => toggle(o.id)}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      <div className="funnel-actions">
        <button
          type="button"
          className="funnel-btn funnel-btn--primary"
          disabled={picked.size === 0}
          onClick={() => onGoTo(step.nextId)}
        >
          {step.continueLabel ?? 'Continuar'}
        </button>
      </div>
    </>
  )
}

function VideoYoutubeControls({
  step,
  onGoTo,
}: {
  step: Extract<FunnelStep, { type: 'video_youtube' }>
  onGoTo: (id: string, meta?: GoToMeta) => void
}) {
  const id = extractYoutubeVideoId(step.youtubeUrl)
  return (
    <>
      {id ? (
        <div className="funnel-youtube">
          <iframe
            title={step.headline ?? 'Video'}
            src={youtubeEmbedSrc(id, true)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <p className="funnel-error">URL de YouTube no válida.</p>
      )}
      <div className="funnel-actions funnel-actions--stack">
        {step.formNextId?.trim() ? (
          <button
            type="button"
            className="funnel-btn funnel-btn--form funnel-btn--link"
            onClick={() => onGoTo(step.formNextId!.trim())}
          >
            {step.formCta.label}
          </button>
        ) : (
          <CtaLink
            cta={step.formCta}
            className="funnel-btn funnel-btn--form funnel-btn--link"
          />
        )}
        {step.nextId ? (
          <button
            type="button"
            className="funnel-btn funnel-btn--ghost"
            onClick={() => onGoTo(step.nextId!)}
          >
            {step.continueLabel ?? 'Continuar'}
          </button>
        ) : null}
      </div>
    </>
  )
}

function CtaExternalControls({
  step,
  onGoTo,
}: {
  step: Extract<FunnelStep, { type: 'cta_external' }>
  onGoTo: (id: string, meta?: GoToMeta) => void
}) {
  return (
    <div className="funnel-actions funnel-actions--stack">
      <CtaLink cta={step.primary} className="funnel-btn funnel-btn--form funnel-btn--link" />
      {step.secondary ? (
        <CtaLink cta={step.secondary} className="funnel-btn funnel-btn--ghost funnel-btn--link" />
      ) : null}
      {step.nextId ? (
        <button type="button" className="funnel-btn funnel-btn--text" onClick={() => onGoTo(step.nextId!)}>
          Continuar sin salir
        </button>
      ) : null}
    </div>
  )
}
