import type { Transition } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'

export type FunnelMotionPack = ReturnType<typeof useFunnelMotion>

/** Transiciones del funnel: springs suaves; con reduced motion casi instantáneo. */
export function useFunnelMotion() {
  const reduced = useReducedMotion() ?? false

  const block: Transition = reduced
    ? { duration: 0.08 }
    : { type: 'spring' as const, stiffness: 400, damping: 34, mass: 0.72 }

  const screen: Transition = reduced
    ? { duration: 0.12 }
    : { type: 'spring' as const, stiffness: 300, damping: 32, mass: 0.88 }

  const stagger = reduced ? 0 : 0.05
  const delayChildren = reduced ? 0 : 0.035

  return {
    reduced,
    block,
    screen,
    progress: reduced
      ? { duration: 0.15 }
      : { type: 'spring' as const, stiffness: 220, damping: 30 },
    stagger,
    delayChildren,
    tap: reduced ? {} : { scale: 0.987 },
    hover: reduced ? {} : { scale: 1.01 },
    /** Stagger principal: título → cuerpo → media → controles */
    outerContainer: {
      hidden: { opacity: 1 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: stagger, delayChildren },
      },
    },
    /** Un bloque (párrafo, bloque de controles, etc.) */
    blockItem: {
      hidden: { opacity: 0, y: reduced ? 0 : 14 },
      visible: { opacity: 1, y: 0, transition: block },
    },
    /** Lista de opciones (respuestas) */
    optionsContainer: {
      hidden: { opacity: 1 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: reduced ? 0 : 0.045, delayChildren: reduced ? 0 : 0.02 },
      },
    },
    optionItem: {
      hidden: { opacity: 0, y: reduced ? 0 : 10 },
      visible: { opacity: 1, y: 0, transition: block },
    },
  }
}
