import { useEffect, useMemo, useRef, useState } from 'react'
import type { AnalysisLoadingStep, GoToMeta } from './types'

type Props = {
  step: AnalysisLoadingStep
  onGoTo: (stepId: string, meta?: GoToMeta) => void
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AnalysisLoadingControls({ step, onGoTo }: Props) {
  const phases = step.phases
  const durationMs = step.durationMs ?? 4800
  const images = step.showcaseImages ?? []
  const doneRef = useRef(false)

  const weights = useMemo(
    () => phases.map((p) => (typeof p.weight === 'number' && p.weight > 0 ? p.weight : 1)),
    [phases],
  )
  const weightSum = useMemo(() => weights.reduce((a, b) => a + b, 0), [weights])
  const segmentMs = useMemo(
    () => weights.map((w) => (durationMs * w) / weightSum),
    [weights, weightSum, durationMs],
  )

  const starts = useMemo(() => {
    const s: number[] = []
    let t = 0
    for (let i = 0; i < segmentMs.length; i++) {
      s.push(t)
      t += segmentMs[i]
    }
    return s
  }, [segmentMs])

  const [t, setT] = useState(0)
  const reduced = prefersReducedMotion()
  const effectiveDuration = reduced ? Math.min(800, durationMs) : durationMs

  useEffect(() => {
    doneRef.current = false
    const start = performance.now()
    let frame = 0

    function tick(now: number) {
      const raw = (now - start) / effectiveDuration
      const next = Math.min(1, raw)
      setT(next)
      if (next < 1) {
        frame = requestAnimationFrame(tick)
      } else if (!doneRef.current) {
        doneRef.current = true
        onGoTo(step.nextId)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [effectiveDuration, onGoTo, step.id, step.nextId])

  /** Tiempo virtual 0…durationMs alineado con t∈[0,1] (misma línea de tiempo que la barra global). */
  const virtualMs = t * durationMs
  const overallPct = Math.round(t * 100)

  let phaseIndex = 0
  for (let i = 0; i < starts.length; i++) {
    if (virtualMs >= starts[i]) phaseIndex = i
  }

  const barPercents = phases.map((_, i) => {
    const segStart = starts[i]
    const segLen = segmentMs[i]
    if (virtualMs <= segStart) return 0
    if (virtualMs >= segStart + segLen) return 100
    return ((virtualMs - segStart) / segLen) * 100
  })

  const active = phases[phaseIndex] ?? phases[0]

  return (
    <div className="funnel-analysis">
      <div className="funnel-analysis__overall" aria-label={`Progreso del análisis ${overallPct} por ciento`}>
        <div className="funnel-analysis__overall-head">
          <span className="funnel-analysis__overall-title">Progreso</span>
          <strong className="funnel-analysis__overall-pct">{overallPct}%</strong>
        </div>
        <div className="funnel-analysis__overall-track">
          <div className="funnel-analysis__overall-fill" style={{ width: `${t * 100}%` }} />
        </div>
      </div>

      <div className="funnel-analysis__status" aria-live="polite">
        <p className="funnel-analysis__title">{active.title}</p>
        {active.subtitle ? <p className="funnel-analysis__subtitle">{active.subtitle}</p> : null}
      </div>

      <div className="funnel-analysis__bars" role="group" aria-label="Etapas del análisis">
        {phases.map((ph, i) => {
          const segStart = starts[i]
          const segEnd = segStart + segmentMs[i]
          const done = virtualMs >= segEnd - 1e-6
          const pending = virtualMs < segStart + 1e-6
          const activeRow = !done && !pending
          const fill = barPercents[i] ?? 0

          let statusLabel: string
          if (done) statusLabel = '✓'
          else if (pending) statusLabel = '…'
          else statusLabel = `${Math.round(fill)}%`

          return (
            <div key={i} className="funnel-analysis__bar-block">
              <div className="funnel-analysis__bar-label">{ph.title}</div>
              <div className="funnel-analysis__bar-track">
                <div className="funnel-analysis__bar-fill" style={{ width: `${fill}%` }} />
              </div>
              <div
                className={
                  'funnel-analysis__bar-status' +
                  (done ? ' funnel-analysis__bar-status--done' : '') +
                  (activeRow ? ' funnel-analysis__bar-status--active' : '')
                }
                aria-hidden
              >
                {statusLabel}
              </div>
            </div>
          )
        })}
      </div>

      <div className="funnel-analysis__showcase">
        <p className="funnel-analysis__showcase-hint">Transformaciones reales</p>
        {images.length > 0 ? (
          <div className="funnel-showcase funnel-showcase--images">
            <div className="funnel-showcase__track">
              {[...images, ...images].map((im, idx) => (
                <figure key={`${im.src}-${idx}`} className="funnel-showcase__card">
                  <img src={im.src} alt={im.alt ?? 'Antes y después'} loading="lazy" />
                </figure>
              ))}
            </div>
          </div>
        ) : (
          <div className="funnel-showcase funnel-showcase--placeholders">
            <div className="funnel-showcase__track funnel-showcase__track--placeholder">
              {[0, 1, 2, 3, 0, 1, 2, 3].map((i, idx) => (
                <div key={`${i}-${idx}`} className="funnel-showcase__placeholder">
                  <span className="funnel-showcase__placeholder-text">Tu foto</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
