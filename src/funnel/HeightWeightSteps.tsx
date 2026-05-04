import { useMemo, useState } from 'react'
import type { GoToMeta, HeightSliderStep, WeightSliderStep } from './types'
import { formatFtIn, formatLbFromKg, kgToLb } from './units'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

type Go = (stepId: string, meta?: GoToMeta) => void

export function HeightSliderControls({ step, onGoTo }: { step: HeightSliderStep; onGoTo: Go }) {
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm')
  const [valueCm, setValueCm] = useState(() =>
    clamp(step.defaultCm, step.minCm, step.maxCm),
  )

  const ftLabel = useMemo(() => formatFtIn(valueCm), [valueCm])
  const minFt = useMemo(() => formatFtIn(step.minCm), [step.minCm])
  const maxFt = useMemo(() => formatFtIn(step.maxCm), [step.maxCm])

  return (
    <div className="funnel-slider-block">
      <div className="funnel-unit-toggle" role="group" aria-label="Unidad de altura">
        <button
          type="button"
          className={'funnel-unit-toggle__btn' + (unit === 'cm' ? ' funnel-unit-toggle__btn--on' : '')}
          aria-pressed={unit === 'cm'}
          onClick={() => setUnit('cm')}
        >
          cm
        </button>
        <button
          type="button"
          className={'funnel-unit-toggle__btn' + (unit === 'ft' ? ' funnel-unit-toggle__btn--on' : '')}
          aria-pressed={unit === 'ft'}
          onClick={() => setUnit('ft')}
        >
          ft
        </button>
      </div>

      <div className="funnel-readout" aria-live="polite">
        {unit === 'cm' ? (
          <>
            <span className="funnel-readout__main">{Math.round(valueCm)} cm</span>
            <span className="funnel-readout__sub">≈ {ftLabel}</span>
          </>
        ) : (
          <>
            <span className="funnel-readout__main">{ftLabel}</span>
            <span className="funnel-readout__sub">≈ {Math.round(valueCm)} cm</span>
          </>
        )}
      </div>

      <div className="funnel-slider-wrap">
        <input
          type="range"
          className="funnel-slider"
          min={step.minCm}
          max={step.maxCm}
          step={1}
          value={valueCm}
          onChange={(e) => setValueCm(Number(e.target.value))}
          aria-valuemin={step.minCm}
          aria-valuemax={step.maxCm}
          aria-valuenow={Math.round(valueCm)}
          aria-label="Altura en centímetros"
        />
        <div className="funnel-slider__ticks" aria-hidden>
          <span>{unit === 'cm' ? `${step.minCm} cm` : minFt}</span>
          <span>{unit === 'cm' ? `${step.maxCm} cm` : maxFt}</span>
        </div>
      </div>

      <div className="funnel-actions">
        <button type="button" className="funnel-btn funnel-btn--form funnel-btn--link" onClick={() => onGoTo(step.nextId)}>
          {step.continueLabel ?? 'Continuar'}
        </button>
      </div>
    </div>
  )
}

export function WeightSliderControls({ step, onGoTo }: { step: WeightSliderStep; onGoTo: Go }) {
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg')
  const [valueKg, setValueKg] = useState(() =>
    clamp(step.defaultKg, step.minKg, step.maxKg),
  )

  const lbRounded = useMemo(() => Math.round(kgToLb(valueKg)), [valueKg])
  const minLb = useMemo(() => Math.round(kgToLb(step.minKg)), [step.minKg])
  const maxLb = useMemo(() => Math.round(kgToLb(step.maxKg)), [step.maxKg])

  return (
    <div className="funnel-slider-block">
      <div className="funnel-unit-toggle" role="group" aria-label="Unidad de peso">
        <button
          type="button"
          className={'funnel-unit-toggle__btn' + (unit === 'kg' ? ' funnel-unit-toggle__btn--on' : '')}
          aria-pressed={unit === 'kg'}
          onClick={() => setUnit('kg')}
        >
          kg
        </button>
        <button
          type="button"
          className={'funnel-unit-toggle__btn' + (unit === 'lb' ? ' funnel-unit-toggle__btn--on' : '')}
          aria-pressed={unit === 'lb'}
          onClick={() => setUnit('lb')}
        >
          lb
        </button>
      </div>

      <div className="funnel-readout" aria-live="polite">
        {unit === 'kg' ? (
          <>
            <span className="funnel-readout__main">{valueKg.toFixed(1)} kg</span>
            <span className="funnel-readout__sub">≈ {formatLbFromKg(valueKg)}</span>
          </>
        ) : (
          <>
            <span className="funnel-readout__main">{lbRounded} lb</span>
            <span className="funnel-readout__sub">≈ {valueKg.toFixed(1)} kg</span>
          </>
        )}
      </div>

      <div className="funnel-slider-wrap">
        <input
          type="range"
          className="funnel-slider"
          min={step.minKg}
          max={step.maxKg}
          step={0.5}
          value={valueKg}
          onChange={(e) => setValueKg(Number(e.target.value))}
          aria-valuemin={step.minKg}
          aria-valuemax={step.maxKg}
          aria-valuenow={valueKg}
          aria-label="Peso en kilogramos"
        />
        <div className="funnel-slider__ticks" aria-hidden>
          <span>{unit === 'kg' ? `${step.minKg} kg` : `${minLb} lb`}</span>
          <span>{unit === 'kg' ? `${step.maxKg} kg` : `${maxLb} lb`}</span>
        </div>
      </div>

      <div className="funnel-actions">
        <button type="button" className="funnel-btn funnel-btn--form funnel-btn--link" onClick={() => onGoTo(step.nextId)}>
          {step.continueLabel ?? 'Continuar'}
        </button>
      </div>
    </div>
  )
}
