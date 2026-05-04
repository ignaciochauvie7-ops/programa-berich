import type { CSSProperties } from 'react'

/** Presets: position + animation variant (cada variante va a un vector distinto). */
const DOTS: { x: string; y: string; v: number; dur: number; delay: number; size: number }[] = [
  { x: '6%', y: '8%', v: 0, dur: 13, delay: 0, size: 2 },
  { x: '18%', y: '72%', v: 1, dur: 16, delay: 0.8, size: 3 },
  { x: '88%', y: '12%', v: 2, dur: 14, delay: 0.3, size: 2 },
  { x: '72%', y: '58%', v: 3, dur: 18, delay: 1.2, size: 2 },
  { x: '42%', y: '6%', v: 4, dur: 15, delay: 2.1, size: 3 },
  { x: '12%', y: '44%', v: 5, dur: 17, delay: 0.5, size: 2 },
  { x: '92%', y: '78%', v: 6, dur: 12, delay: 1.8, size: 2 },
  { x: '55%', y: '88%', v: 7, dur: 19, delay: 0.2, size: 3 },
  { x: '28%', y: '22%', v: 2, dur: 14, delay: 3.2, size: 2 },
  { x: '65%', y: '28%', v: 0, dur: 16, delay: 2.5, size: 2 },
  { x: '8%', y: '92%', v: 4, dur: 13, delay: 1.1, size: 3 },
  { x: '48%', y: '48%', v: 1, dur: 20, delay: 0.9, size: 2 },
  { x: '78%', y: '38%', v: 5, dur: 15, delay: 2.8, size: 2 },
  { x: '32%', y: '62%', v: 7, dur: 17, delay: 1.5, size: 2 },
  { x: '95%', y: '48%', v: 3, dur: 14, delay: 0.6, size: 3 },
  { x: '22%', y: '88%', v: 6, dur: 18, delay: 2.2, size: 2 },
  { x: '58%', y: '18%', v: 2, dur: 11, delay: 3.5, size: 2 },
  { x: '38%', y: '36%', v: 0, dur: 16, delay: 1.9, size: 2 },
  { x: '82%', y: '92%', v: 4, dur: 13, delay: 0.4, size: 3 },
  { x: '4%', y: '52%', v: 7, dur: 15, delay: 2.6, size: 2 },
  { x: '70%', y: '8%', v: 1, dur: 17, delay: 1.3, size: 2 },
  { x: '52%', y: '72%', v: 5, dur: 14, delay: 0.7, size: 2 },
  { x: '14%', y: '28%', v: 3, dur: 19, delay: 2.9, size: 2 },
  { x: '62%', y: '52%', v: 6, dur: 12, delay: 1.6, size: 3 },
]

export function NeonDots() {
  return (
    <div className="funnel-dots" aria-hidden>
      {DOTS.map((d, i) => (
        <span
          key={i}
          className={`funnel-dot funnel-dot--v${d.v}`}
          style={
            {
              '--dot-x': d.x,
              '--dot-y': d.y,
              '--dot-dur': `${d.dur}s`,
              '--dot-delay': `${d.delay}s`,
              '--dot-size': `${d.size}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
