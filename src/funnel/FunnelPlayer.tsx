import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import type { FunnelBranch, FunnelDefinition, FunnelStep, GoToMeta } from './types'
import { FunnelValidationError, loadFunnelBySlug } from './loadFunnel'
import { StepRenderer } from './StepRenderer'
import {
  appendVisitedId,
  clearFunnelSession,
  popStepHistory,
  readBranch,
  readStepHistory,
  readStoredStepId,
  seedStepHistory,
  pushStepHistory,
  writeBranch,
  writeStoredStepId,
} from './session'
import { computeTailDepthByStepId, funnelProgressRatio } from './funnelGraph'
import { NeonDots } from './NeonDots'
import { useFunnelMotion } from './funnelMotion'
import './funnel.css'

function buildIndex(steps: FunnelStep[]): Map<string, FunnelStep> {
  const m = new Map<string, FunnelStep>()
  for (const s of steps) m.set(s.id, s)
  return m
}

function applyTheme(theme: FunnelDefinition['theme']): void {
  const root = document.documentElement
  if (theme?.accent) root.style.setProperty('--funnel-accent', theme.accent)
  if (theme?.accentSoft) root.style.setProperty('--funnel-accent-soft', theme.accentSoft)
  if (theme?.background) root.style.setProperty('--funnel-bg', theme.background)
}

export function FunnelPlayer() {
  const motionPack = useFunnelMotion()
  const { slug = '' } = useParams<{ slug: string }>()
  const [def, setDef] = useState<FunnelDefinition | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [branch, setBranch] = useState<FunnelBranch | null>(null)
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadFunnelBySlug(slug)
      .then((d) => {
        if (cancelled) return
        const restart =
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('restart') === '1'
        if (restart) {
          clearFunnelSession(slug)
          window.history.replaceState({}, '', `${window.location.pathname}`)
        }
        applyTheme(d.theme)
        document.title = d.title
        setDef(d)
        const stored = restart ? null : readStoredStepId(slug)
        const byId = buildIndex(d.steps)
        const initial =
          stored && byId.has(stored) ? stored : d.startStepId
        setCurrentId(initial)
        appendVisitedId(slug, initial)
        writeStoredStepId(slug, initial)
        const storedHistory = restart ? [] : readStepHistory(slug)
        const history =
          storedHistory.length > 0 && storedHistory[storedHistory.length - 1] === initial
            ? storedHistory
            : seedStepHistory(slug, initial)
        setCanGoBack(history.length > 1)
        setBranch(readBranch(slug))
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg =
          e instanceof FunnelValidationError
            ? e.message
            : 'No se pudo cargar el embudo.'
        setErr(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      document.documentElement.style.removeProperty('--funnel-accent')
      document.documentElement.style.removeProperty('--funnel-accent-soft')
      document.documentElement.style.removeProperty('--funnel-bg')
    }
  }, [slug])

  const byId = useMemo(() => (def ? buildIndex(def.steps) : null), [def])
  const tailDepthByStepId = useMemo(
    () => (def ? computeTailDepthByStepId(def.steps) : null),
    [def],
  )

  const goTo = useCallback(
    (stepId: string, meta?: GoToMeta) => {
      const id = stepId.trim()
      if (!byId?.has(id)) return
      if (meta?.branch) {
        writeBranch(slug, meta.branch)
        setBranch(meta.branch)
      }
      setCurrentId(id)
      writeStoredStepId(slug, id)
      const history = pushStepHistory(slug, id)
      setCanGoBack(history.length > 1)
      appendVisitedId(slug, id)
    },
    [byId, slug],
  )

  const goBack = useCallback(() => {
    const { previous, history } = popStepHistory(slug)
    if (!previous || !byId?.has(previous)) return
    setCurrentId(previous)
    writeStoredStepId(slug, previous)
    setCanGoBack(history.length > 1)
  }, [byId, slug])

  const progress = useMemo(() => {
    if (!def || !currentId || !tailDepthByStepId) return 0
    const history = readStepHistory(slug)
    return funnelProgressRatio({
      historyLength: history.length,
      currentStepId: currentId,
      tailDepthById: tailDepthByStepId,
    })
  }, [def, currentId, slug, tailDepthByStepId])

  const step = currentId && byId ? byId.get(currentId) : undefined

  if (loading) {
    return (
      <div className="funnel-root">
        <NeonDots />
        <motion.div
          className="funnel-shell funnel-state"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionPack.screen}
        >
          Cargando…
        </motion.div>
      </div>
    )
  }

  if (err || !def || !step) {
    return (
      <div className="funnel-root">
        <NeonDots />
        <motion.div
          className="funnel-shell funnel-state"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={motionPack.screen}
        >
          <h1>No disponible</h1>
          <p>{err ?? 'Embudo incompleto.'}</p>
          <button
            type="button"
            className="funnel-btn funnel-btn--ghost"
            onClick={() => {
              clearFunnelSession(slug)
              window.location.reload()
            }}
          >
            Reintentar
          </button>
        </motion.div>
      </div>
    )
  }

  const isBerichClose = step.type === 'berich_close'
  const showBackButton = step.id !== 'inicio'
  const showTopBar = step.type !== 'video_youtube' && !isBerichClose
  const centerStage =
    !isBerichClose &&
    (step.type === 'video_youtube' ||
      step.type === 'cta_external' ||
      step.type === 'height_slider' ||
      step.type === 'weight_slider' ||
      step.type === 'analysis_loading' ||
      step.type === 'prefinal_loading' ||
      step.id === 'form_intro' ||
      step.id === 'q_sexo' ||
      step.id === 'edad_hombre' ||
      step.id === 'edad_mujer' ||
      step.id === 'objetivo_hombre' ||
      step.id === 'objetivo_mujer' ||
      step.id === 'impedimento_hombre_musculo' ||
      step.id === 'impedimento_hombre_meta' ||
      step.id === 'impedimento_mujer_musculo' ||
      step.id === 'impedimento_mujer_meta' ||
      step.id === 'moneda_hombre_musculo' ||
      step.id === 'moneda_hombre_meta' ||
      step.id === 'moneda_mujer_musculo' ||
      step.id === 'moneda_mujer_meta')

  const branchAttr = branch ? ({ 'data-branch': branch } as const) : {}

  return (
    <div
      className={
        'funnel-root' +
        (centerStage ? ' funnel-root--center-stage' : '') +
        (isBerichClose ? ' funnel-root--berich-close' : '')
      }
      {...branchAttr}
    >
      <NeonDots />
      <div
        className={
          'funnel-shell' +
          (centerStage ? ' funnel-shell--centered' : '') +
          (isBerichClose ? ' funnel-shell--berich' : '')
        }
      >
        {showBackButton ? (
          <button
            type="button"
            className="funnel-back"
            onClick={goBack}
            aria-label="Volver al paso anterior"
            disabled={!canGoBack}
          >
            <span aria-hidden>←</span>
          </button>
        ) : null}
        {showTopBar ? (
          <header className="funnel-top">
            <span className="funnel-brand">{def.title}</span>
            <div className="funnel-progress" aria-hidden>
              <motion.div
                className="funnel-progress__fill"
                initial={false}
                animate={{ width: `${Math.round(progress * 1000) / 10}%` }}
                transition={motionPack.progress}
              />
            </div>
          </header>
        ) : null}
        <div className={'funnel-card' + (isBerichClose ? ' funnel-card--berich' : '')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{
                opacity: 0,
                y: motionPack.reduced ? 0 : 16,
                scale: motionPack.reduced ? 1 : 0.99,
                filter: motionPack.reduced ? 'none' : 'blur(6px)',
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: motionPack.reduced ? 'none' : 'blur(0px)',
              }}
              exit={{
                opacity: 0,
                y: motionPack.reduced ? 0 : -12,
                scale: motionPack.reduced ? 1 : 0.995,
                filter: motionPack.reduced ? 'none' : 'blur(4px)',
              }}
              transition={motionPack.screen}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <StepRenderer step={step} onGoTo={goTo} motion={motionPack} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
