import { useEffect, useRef, useState } from 'react'
import type { GoToMeta, PrefinalLoadingStep } from './types'

type Props = {
  step: PrefinalLoadingStep
  onGoTo: (stepId: string, meta?: GoToMeta) => void
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Umbrales dentro de t∈[0,1] para mostrar cada check (uno tras otro, antes de terminar la barra). */
function checkVisible(t: number, index: number, total: number): boolean {
  if (total <= 0) return false
  const start = 0.06 + (index / total) * 0.52
  return t >= start
}

export function PrefinalLoadingControls({ step, onGoTo }: Props) {
  const durationMs = step.durationMs ?? 3600
  const checks = step.checks
  const p0 = step.progressStart
  const p1 = step.progressEnd
  const doneRef = useRef(false)
  const [t, setT] = useState(0)
  const reduced = prefersReducedMotion()
  const effectiveDuration = reduced ? Math.min(900, durationMs) : durationMs

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
  }, [effectiveDuration, onGoTo, step.nextId])

  const pct = p0 + (p1 - p0) * t

  return (
    <div className="funnel-prefin">
      <div className="funnel-prefin__bar-row">
        <div
          className="funnel-prefin__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
        >
          <div className="funnel-prefin__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="funnel-prefin__pct" aria-hidden>
          {Math.round(pct)}%
        </span>
      </div>
      <ul className="funnel-prefin__checks" aria-label="Pasos completados">
        {checks.map((label, i) => {
          const on = checkVisible(t, i, checks.length)
          return (
            <li key={i} className={'funnel-prefin__check' + (on ? ' funnel-prefin__check--on' : '')}>
              <span className="funnel-prefin__mark" aria-hidden>
                {on ? '✓' : ' '}
              </span>
              <span className="funnel-prefin__check-label">{label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
