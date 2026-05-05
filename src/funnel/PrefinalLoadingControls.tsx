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

/** Cada check se activa cuando la barra alcanza la misma fracción del tiempo (t), alineado con progressStart→End. */
function checkOn(t: number, index: number, total: number): boolean {
  if (total <= 0) return false
  const threshold = (index + 1) / total
  return t + 1e-9 >= threshold
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
  }, [effectiveDuration, onGoTo, step.id, step.nextId])

  const pct = p0 + (p1 - p0) * t
  const pctRounded = Math.round(pct)

  return (
    <div className="funnel-prefin">
      <div className="funnel-prefin__bar-row">
        <div
          className="funnel-prefin__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pctRounded}
        >
          <div className="funnel-prefin__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="funnel-prefin__pct" aria-hidden>
          {pctRounded}%
        </span>
      </div>
      <ul className="funnel-prefin__checks" aria-label="Pasos completados">
        {checks.map((label, i) => {
          const on = checkOn(t, i, checks.length)
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
