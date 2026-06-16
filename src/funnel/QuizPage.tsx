import { type CSSProperties, useEffect, useState } from 'react'
import { QuizGoalTransformationMarquee, QuizTransformationMarquee } from './QuizTransformationMarquee'
import './quiz.css'
import hombreAImage from '../../supabase/quiz hombre nuevo/1.png'
import hombreBImage from '../../supabase/quiz hombre nuevo/2.png'
import hombreCImage from '../../supabase/quiz hombre nuevo/3.png'
import hombreDImage from '../../supabase/quiz hombre nuevo/4.png'
import hombreEImage from '../../supabase/quiz hombre nuevo/5.png'
import hombreFImage from '../../supabase/quiz hombre nuevo/6.png'
import mujerAImage from '../../supabase/quiz mujer nuevo/1.png'
import mujerBImage from '../../supabase/quiz mujer nuevo/2.png'
import mujerCImage from '../../supabase/quiz mujer nuevo/3.png'
import mujerDImage from '../../supabase/quiz mujer nuevo/4.png'
import mujerEImage from '../../supabase/quiz mujer nuevo/5.png'
import mujerFImage from '../../supabase/quiz mujer nuevo/6.png'
import quizLogo from '../../supabase/IMG_3353.jpg'

type Sex = 'hombre' | 'mujer'
type AgeRange = 'Menos de 20' | '20-30' | '30-45' | '45-60' | 'Más de 60'
type HeightUnit = 'cm' | 'in'
type WeightUnit = 'kg' | 'lb'
type Goal = 'Ganar músculo' | 'Perder grasa' | 'Recomposición corporal'
type ImpedimentPath = 'musculo' | 'grasa-recomp'
type MuscleImpediment =
  | 'No sé por dónde empezar'
  | 'Como mucho y no subo de peso'
  | 'Entreno pero no crezco'
  | 'No noto cambios'
  | 'No tengo tiempo para entrenar'
type FatRecompImpediment =
  | 'Hambre constante y ansiedad'
  | 'No saber qué comer'
  | 'Odio hacer dieta'
  | 'Falta de tiempo'
  | 'Me cuesta ser constante'
  | 'No sé por dónde empezar'
type Impediment = MuscleImpediment | FatRecompImpediment
type ResultGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
type ResultDestination = `H-${ResultGroup}` | `M-${ResultGroup}`
type FinalLoadingStage = 1 | 2
type FinalVariant = {
  videoUrl: string
  imageUrl: string
}

const totalQuestions = 7
const ageOptions: AgeRange[] = ['Menos de 20', '20-30', '30-45', '45-60', 'Más de 60']
const goalOptions: Goal[] = ['Ganar músculo', 'Perder grasa', 'Recomposición corporal']
const muscleImpedimentOptions: MuscleImpediment[] = [
  'No sé por dónde empezar',
  'Como mucho y no subo de peso',
  'Entreno pero no crezco',
  'No noto cambios',
  'No tengo tiempo para entrenar',
]
const fatRecompImpedimentOptions: FatRecompImpediment[] = [
  'Hambre constante y ansiedad',
  'No saber qué comer',
  'Odio hacer dieta',
  'Falta de tiempo',
  'Me cuesta ser constante',
  'No sé por dónde empezar',
]
const finalVimeoEmbedParams = '?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0'

const finalVariants: Record<ResultDestination, FinalVariant> = {
  'H-A': {
    videoUrl: `https://player.vimeo.com/video/1197374009${finalVimeoEmbedParams}`,
    imageUrl: hombreAImage,
  },
  'H-B': {
    videoUrl: `https://player.vimeo.com/video/1197374011${finalVimeoEmbedParams}`,
    imageUrl: hombreBImage,
  },
  'H-C': {
    videoUrl: `https://player.vimeo.com/video/1197374010${finalVimeoEmbedParams}`,
    imageUrl: hombreCImage,
  },
  'H-D': {
    videoUrl: `https://player.vimeo.com/video/1197374041${finalVimeoEmbedParams}`,
    imageUrl: hombreDImage,
  },
  'H-E': {
    videoUrl: `https://player.vimeo.com/video/1197374040${finalVimeoEmbedParams}`,
    imageUrl: hombreEImage,
  },
  'H-F': {
    videoUrl: `https://player.vimeo.com/video/1197374043${finalVimeoEmbedParams}`,
    imageUrl: hombreFImage,
  },
  'M-A': {
    videoUrl: `https://player.vimeo.com/video/1197374009${finalVimeoEmbedParams}`,
    imageUrl: mujerAImage,
  },
  'M-B': {
    videoUrl: `https://player.vimeo.com/video/1197374011${finalVimeoEmbedParams}`,
    imageUrl: mujerBImage,
  },
  'M-C': {
    videoUrl: `https://player.vimeo.com/video/1197374010${finalVimeoEmbedParams}`,
    imageUrl: mujerCImage,
  },
  'M-D': {
    videoUrl: `https://player.vimeo.com/video/1197374041${finalVimeoEmbedParams}`,
    imageUrl: mujerDImage,
  },
  'M-E': {
    videoUrl: `https://player.vimeo.com/video/1197374040${finalVimeoEmbedParams}`,
    imageUrl: mujerEImage,
  },
  'M-F': {
    videoUrl: `https://player.vimeo.com/video/1197374043${finalVimeoEmbedParams}`,
    imageUrl: mujerFImage,
  },
}
const finalLoadingCopy: Record<FinalLoadingStage, { title: string; checks: string[] }> = {
  1: {
    title: 'Analizando tus respuestas...',
    checks: [
      '✓ Analizando tu objetivo físico',
      '✓ Evaluando tu punto de partida',
      '✓ Identificando obstáculos principales',
    ],
  },
  2: {
    title: 'Comparando tu perfil con otros casos similares...',
    checks: [
      '✓ Comparando con perfiles similares',
      '✓ Calculando nivel de dificultad',
      '✓ Detectando el tipo de plan ideal',
    ],
  },
}
/** Debe coincidir con api/_lib/programPrice.ts y el producto en Dodo. */
const PROGRAM_USD_PRICE = 49

const faqItems = [
  {
    question: '¿Necesito experiencia previa para hacer el programa?',
    answer:
      'No. El programa está diseñado para cualquier nivel, desde cero hasta avanzado. Hay rutinas y contenido adaptado a cada situación.',
  },
  {
    question: '¿En cuánto tiempo voy a ver resultados?',
    answer:
      'Depende de tu punto de partida y tu constancia, pero la mayoría nota cambios visibles en las primeras 4 a 8 semanas siguiendo el plan correctamente.',
  },
  {
    question: '¿Cuánto tiempo por día necesito dedicarle?',
    answer:
      'Depende de cuántos días entrenés por semana. Las rutinas están diseñadas para adaptarse a tu tiempo disponible, desde 2 días hasta 6.',
  },
  {
    question: '¿Tengo acceso de por vida al contenido?',
    answer: 'Sí. Una vez que comprás, el acceso al contenido es permanente.',
  },
  {
    question: '¿Qué pasa si tengo dudas durante el programa?',
    answer: 'El Plan Guiado incluye recordatorios personalizados en tu navegador para sostenerte en el plan durante 6 meses.',
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void
}

export function QuizPage() {
  const [started, setStarted] = useState(false)
  const [question, setQuestion] = useState(1)
  const [sex, setSex] = useState<Sex | null>(null)
  const [age, setAge] = useState<AgeRange | null>(null)
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm')
  const [height, setHeight] = useState(170)
  const [heightConfirmed, setHeightConfirmed] = useState(false)
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const [weight, setWeight] = useState(75)
  const [weightConfirmed, setWeightConfirmed] = useState(false)
  const [pesoIdeal, setPesoIdeal] = useState(75)
  const [pesoIdealConfirmed, setPesoIdealConfirmed] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [impedimentPath, setImpedimentPath] = useState<ImpedimentPath | null>(null)
  const [impediment, setImpediment] = useState<Impediment | null>(null)
  const [resultGroup, setResultGroup] = useState<ResultGroup | null>(null)
  const [resultDestination, setResultDestination] = useState<ResultDestination | null>(null)
  const [finalLoadingStage, setFinalLoadingStage] = useState<FinalLoadingStage>(1)
  const [finalLoadingProgress, setFinalLoadingProgress] = useState(0)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const accentColor = sex === 'mujer' ? '#ff4dc4' : '#00e5ff'
  const answeredQuestions = [sex, age, heightConfirmed, weightConfirmed, goal, pesoIdealConfirmed, resultGroup].filter(
    Boolean,
  ).length
  const progress = started ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
  const visibleChecks = loadingProgress >= 34 ? (loadingProgress >= 72 ? (loadingProgress >= 96 ? 3 : 2) : 1) : 0
  const finalVisibleChecks =
    finalLoadingProgress >= 34 ? (finalLoadingProgress >= 72 ? (finalLoadingProgress >= 96 ? 3 : 2) : 1) : 0
  const currentFinalLoadingCopy = finalLoadingCopy[finalLoadingStage]
  const finalVariant = resultDestination ? finalVariants[resultDestination] : null
  const screenClass = 'quiz-screen screen-enter'

  const transitionScreen = (callback: () => void) => {
    const transitionDocument = document as ViewTransitionDocument

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(callback)
      return
    }

    callback()
  }

  useEffect(() => {
    if (question !== 5) return

    setLoadingProgress(0)

    const steps = [
      { value: 18, delay: 180 },
      { value: 34, delay: 360 },
      { value: 48, delay: 760 },
      { value: 63, delay: 1120 },
      { value: 72, delay: 1500 },
      { value: 86, delay: 1960 },
      { value: 96, delay: 2380 },
      { value: 100, delay: 2840 },
    ]

    const timers = steps.map((step) => window.setTimeout(() => setLoadingProgress(step.value), step.delay))
    const nextTimer = window.setTimeout(() => transitionScreen(() => setQuestion(6)), 3340)

    return () => {
      timers.forEach(window.clearTimeout)
      window.clearTimeout(nextTimer)
    }
  }, [question])

  useEffect(() => {
    if (question !== 9 && question !== 10) return

    setFinalLoadingProgress(0)

    const steps = [
      { value: 21, delay: 160 },
      { value: 39, delay: 420 },
      { value: 52, delay: 850 },
      { value: 68, delay: 1260 },
      { value: 79, delay: 1780 },
      { value: 91, delay: 2300 },
      { value: 100, delay: 2920 },
    ]

    const timers = steps.map((step) => window.setTimeout(() => setFinalLoadingProgress(step.value), step.delay))
    const nextTimer = window.setTimeout(() => {
      if (question === 9) {
        transitionScreen(() => {
          setFinalLoadingStage(2)
          setQuestion(10)
        })
        return
      }

      transitionScreen(() => setQuestion(11))
    }, 3420)

    return () => {
      timers.forEach(window.clearTimeout)
      window.clearTimeout(nextTimer)
    }
  }, [question])

  const chooseSex = (value: Sex) => {
    transitionScreen(() => {
      setSex(value)
      setQuestion(2)
    })
  }

  const chooseAge = (value: AgeRange) => {
    transitionScreen(() => {
      setAge(value)
      setQuestion(3)
    })
  }

  const changeHeightUnit = (unit: HeightUnit) => {
    if (unit === heightUnit) return

    if (unit === 'in') {
      setHeight(clamp(Math.round(height / 2.54), 55, 87))
    } else {
      setHeight(clamp(Math.round(height * 2.54), 140, 220))
    }

    setHeightUnit(unit)
  }

  const changeWeightUnit = (unit: WeightUnit) => {
    if (unit === weightUnit) return

    if (unit === 'lb') {
      setWeight(clamp(Math.round(weight * 2.20462), 88, 350))
      setPesoIdeal(clamp(Math.round(pesoIdeal * 2.20462), 88, 350))
    } else {
      setWeight(clamp(Math.round(weight / 2.20462), 40, 160))
      setPesoIdeal(clamp(Math.round(pesoIdeal / 2.20462), 40, 160))
    }

    setWeightUnit(unit)
  }

  const continueFromWeight = () => {
    transitionScreen(() => {
      setWeightConfirmed(true)
      setPesoIdeal(weight)
      setQuestion(5)
    })
  }

  const chooseGoal = (value: Goal) => {
    const nextPath = value === 'Ganar músculo' ? 'musculo' : 'grasa-recomp'

    transitionScreen(() => {
      setGoal(value)
      setImpedimentPath(nextPath)
      setQuestion(7)
    })
  }

  const continueFromPesoIdeal = () => {
    transitionScreen(() => {
      setPesoIdealConfirmed(true)
      setQuestion(8)
    })
  }

  const getGroupForImpediment = (value: Impediment, path: ImpedimentPath): ResultGroup => {
    if (path === 'musculo') {
      if (value === 'No sé por dónde empezar' || value === 'Como mucho y no subo de peso') return 'A'
      if (value === 'Entreno pero no crezco' || value === 'No noto cambios') return 'B'
      return 'C'
    }

    if (
      value === 'Hambre constante y ansiedad' ||
      value === 'No saber qué comer' ||
      value === 'Odio hacer dieta'
    ) {
      return 'D'
    }

    if (value === 'Falta de tiempo') return 'E'

    return 'F'
  }

  async function startCheckout() {
    if (!resultDestination || checkoutBusy || !sex || !age || !goal || !impediment || !impedimentPath) return

    setCheckoutError(null)
    setCheckoutBusy(true)

    const heightCm = heightUnit === 'cm' ? height : Math.round(height * 2.54)
    const weightKg = weightUnit === 'kg' ? weight : Math.round(weight * 0.453592)
    const pesoIdealKg = weightUnit === 'kg' ? pesoIdeal : Math.round(pesoIdeal * 0.453592)

    try {
      const res = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant: resultDestination,
          quiz: {
            variant: resultDestination,
            sex,
            age_range: age,
            height_cm: heightCm,
            weight_kg: weightKg,
            peso_ideal_kg: pesoIdealKg,
            goal,
            impediment,
            impediment_path: impedimentPath,
          },
        }),
      })

      const body = (await res.json()) as { checkout_url?: string; error?: string }
      if (!res.ok || !body.checkout_url) {
        throw new Error(body.error ?? 'No se pudo iniciar el pago. Intentá de nuevo.')
      }

      window.location.href = body.checkout_url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar el pago'
      setCheckoutError(message)
      setCheckoutBusy(false)
    }
  }

  const chooseImpediment = (value: Impediment) => {
    if (!sex || !impedimentPath) return

    const group = getGroupForImpediment(value, impedimentPath)
    const destination = `${sex === 'hombre' ? 'H' : 'M'}-${group}` as ResultDestination

    transitionScreen(() => {
      setImpediment(value)
      setResultGroup(group)
      setResultDestination(destination)
      setFinalLoadingStage(1)
      setQuestion(9)
    })
  }

  const canGoBack = started

  const goBack = () => {
    if (!started) return

    transitionScreen(() => {
      if (question === 11) {
        setResultGroup(null)
        setResultDestination(null)
        setImpediment(null)
        setFinalLoadingStage(1)
        setFinalLoadingProgress(0)
        setQuestion(8)
        return
      }

      if (question === 10) {
        setFinalLoadingStage(1)
        setFinalLoadingProgress(0)
        setQuestion(9)
        return
      }

      if (question === 9) {
        setResultGroup(null)
        setResultDestination(null)
        setImpediment(null)
        setFinalLoadingStage(1)
        setFinalLoadingProgress(0)
        setQuestion(8)
        return
      }

      if (question === 8) {
        setPesoIdealConfirmed(false)
        setQuestion(7)
        return
      }

      if (question === 7) {
        setQuestion(6)
        return
      }

      if (question === 6) {
        setGoal(null)
        setImpedimentPath(null)
        setQuestion(4)
        return
      }

      if (question === 5) {
        setQuestion(4)
        return
      }

      if (question === 4) {
        setWeightConfirmed(false)
        setQuestion(3)
        return
      }

      if (question === 3) {
        setHeightConfirmed(false)
        setQuestion(2)
        return
      }

      if (question === 2) {
        setAge(null)
        setQuestion(1)
        return
      }

      setSex(null)
      setStarted(false)
    })
  }

  return (
    <main className="quiz-page" style={{ '--quiz-accent': accentColor } as CSSProperties}>
      {canGoBack ? (
        <button type="button" className="quiz-back" onClick={goBack} aria-label="Volver a la pantalla anterior">
          ←
        </button>
      ) : null}
      <img className="quiz-logo" src={quizLogo} alt="Berich" />

      {question !== 11 && (
        <div className="quiz-progress" aria-label={`Progreso del quiz: ${progress}%`}>
          <div className="quiz-progress__bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {!started ? (
        <section className={`${screenClass} quiz-screen--intro`}>
          <div className="quiz-intro-badge">⭐ +50 personas ya transformaron su cuerpo con este método</div>
          <h1>Encontremos el plan perfecto para vos</h1>
          <p>Respondé unas preguntas y te mostramos exactamente qué necesitás para lograr tu objetivo</p>
          <div className="quiz-intro-features" aria-label="Beneficios del quiz">
            <div className="quiz-intro-feature">
              <span>🎯</span>
              <strong>Personalizado</strong>
            </div>
            <div className="quiz-intro-feature">
              <span>⚡</span>
              <strong>Menos de 1 minuto</strong>
            </div>
            <div className="quiz-intro-feature">
              <span>🔒</span>
              <strong>Sin compromiso</strong>
            </div>
          </div>
          <button
            className="quiz-primary-btn quiz-intro-btn"
            type="button"
            onClick={() => transitionScreen(() => setStarted(true))}
          >
            Empezar ahora →
          </button>
          <small className="quiz-intro-note">Sin tarjeta de crédito requerida</small>
        </section>
      ) : question === 1 ? (
        <section className={screenClass}>
          <h1>¿Cuál es tu sexo?</h1>
          <div className="quiz-options">
            <button
              className={'quiz-option' + (sex === 'hombre' ? ' quiz-option--selected' : '')}
              type="button"
              onClick={() => chooseSex('hombre')}
            >
              Hombre
            </button>
            <button
              className={'quiz-option' + (sex === 'mujer' ? ' quiz-option--selected' : '')}
              type="button"
              onClick={() => chooseSex('mujer')}
            >
              Mujer
            </button>
          </div>
        </section>
      ) : question === 2 ? (
        <section className={screenClass}>
          <h1>¿Cuál es tu edad?</h1>
          <div className="quiz-options quiz-options--stack">
            {ageOptions.map((option) => (
              <button
                key={option}
                className={'quiz-option' + (age === option ? ' quiz-option--selected' : '')}
                type="button"
                onClick={() => chooseAge(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      ) : question === 3 ? (
        <section className={screenClass}>
          <h1>¿Cuál es tu altura?</h1>
          <div className="quiz-slider-block">
            <div className="quiz-value">
              {height} {heightUnit}
            </div>
            <div className="quiz-toggle" aria-label="Unidad de altura">
              <button
                className={heightUnit === 'cm' ? 'quiz-toggle__btn quiz-toggle__btn--active' : 'quiz-toggle__btn'}
                type="button"
                onClick={() => changeHeightUnit('cm')}
              >
                cm
              </button>
              <button
                className={heightUnit === 'in' ? 'quiz-toggle__btn quiz-toggle__btn--active' : 'quiz-toggle__btn'}
                type="button"
                onClick={() => changeHeightUnit('in')}
              >
                in
              </button>
            </div>
            <input
              className="quiz-range"
              type="range"
              min={heightUnit === 'cm' ? 140 : 55}
              max={heightUnit === 'cm' ? 220 : 87}
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
            />
          </div>
          <button
            className="quiz-primary-btn"
            type="button"
            onClick={() => {
              transitionScreen(() => {
                setHeightConfirmed(true)
                setQuestion(4)
              })
            }}
          >
            Continuar
          </button>
        </section>
      ) : question === 4 ? (
        <section className={screenClass}>
          <h1>¿Cuál es tu peso?</h1>
          <div className="quiz-slider-block">
            <div className="quiz-value">
              {weight} {weightUnit}
            </div>
            <div className="quiz-toggle" aria-label="Unidad de peso">
              <button
                className={weightUnit === 'kg' ? 'quiz-toggle__btn quiz-toggle__btn--active' : 'quiz-toggle__btn'}
                type="button"
                onClick={() => changeWeightUnit('kg')}
              >
                kg
              </button>
              <button
                className={weightUnit === 'lb' ? 'quiz-toggle__btn quiz-toggle__btn--active' : 'quiz-toggle__btn'}
                type="button"
                onClick={() => changeWeightUnit('lb')}
              >
                lb
              </button>
            </div>
            <input
              className="quiz-range"
              type="range"
              min={weightUnit === 'kg' ? 40 : 88}
              max={weightUnit === 'kg' ? 160 : 350}
              value={weight}
              onChange={(event) => setWeight(Number(event.target.value))}
            />
          </div>
          <button className="quiz-primary-btn" type="button" onClick={continueFromWeight}>
            Continuar
          </button>
        </section>
      ) : question === 5 ? (
        <section className={screenClass}>
          <h1>Analizando tus características...</h1>
          <div className="quiz-loading">
            <div className="quiz-loading__track" aria-label={`Analisis en progreso: ${loadingProgress}%`}>
              <div className="quiz-loading__bar" style={{ width: `${loadingProgress}%` }} />
            </div>
            <div className="quiz-loading__percent">{loadingProgress}%</div>
            <ul className="quiz-checks" aria-live="polite">
              {visibleChecks >= 1 && <li>✓ Analizando tu perfil físico</li>}
              {visibleChecks >= 2 && <li>✓ Comparando con perfiles similares</li>}
              {visibleChecks >= 3 && <li>✓ Preparando tu plan</li>}
            </ul>
          </div>
          {sex ? <QuizTransformationMarquee sex={sex} /> : null}
        </section>
      ) : question === 6 ? (
        <section className={screenClass}>
          <h1>¿Cuál es tu objetivo principal?</h1>
          <div className="quiz-options quiz-options--stack">
            {goalOptions.map((option) => (
              <button
                key={option}
                className={'quiz-option' + (goal === option ? ' quiz-option--selected' : '')}
                type="button"
                onClick={() => chooseGoal(option)}
                data-next-path={impedimentPath ?? undefined}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      ) : question === 7 ? (
        <section className={screenClass}>
          <h1>¿Cuál es tu peso ideal?</h1>
          <div className="quiz-slider-block">
            <div className="quiz-value-row">
              <div className="quiz-value">
                {pesoIdeal} {weightUnit}
              </div>
              {pesoIdeal !== weight && (
                <span
                  className={
                    pesoIdeal > weight ? 'quiz-weight-diff quiz-weight-diff--up' : 'quiz-weight-diff quiz-weight-diff--down'
                  }
                >
                  {pesoIdeal > weight ? '+' : ''}
                  {pesoIdeal - weight}
                  {weightUnit}
                </span>
              )}
            </div>
            <div className="quiz-toggle" aria-label="Unidad de peso ideal">
              <button
                className={weightUnit === 'kg' ? 'quiz-toggle__btn quiz-toggle__btn--active' : 'quiz-toggle__btn'}
                type="button"
                onClick={() => changeWeightUnit('kg')}
              >
                kg
              </button>
              <button
                className={weightUnit === 'lb' ? 'quiz-toggle__btn quiz-toggle__btn--active' : 'quiz-toggle__btn'}
                type="button"
                onClick={() => changeWeightUnit('lb')}
              >
                lb
              </button>
            </div>
            <input
              className="quiz-range"
              type="range"
              min={weightUnit === 'kg' ? 40 : 88}
              max={weightUnit === 'kg' ? 160 : 350}
              value={pesoIdeal}
              onChange={(event) => setPesoIdeal(Number(event.target.value))}
            />
          </div>
          <button className="quiz-primary-btn" type="button" onClick={continueFromPesoIdeal}>
            Continuar
          </button>
        </section>
      ) : question === 8 ? (
        <section className={screenClass}>
          <h1>¿Qué te ha impedido lograr tus objetivos?</h1>
          <div className="quiz-options quiz-options--stack">
            {(impedimentPath === 'musculo' ? muscleImpedimentOptions : fatRecompImpedimentOptions).map((option) => (
              <button
                key={option}
                className={'quiz-option' + (impediment === option ? ' quiz-option--selected' : '')}
                type="button"
                onClick={() => chooseImpediment(option)}
                data-result-group={resultGroup ?? undefined}
                data-result-destination={resultDestination ?? undefined}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      ) : question === 9 || question === 10 ? (
        <section className={screenClass}>
          <h1>{currentFinalLoadingCopy.title}</h1>
          <div className="quiz-loading">
            <div className="quiz-loading__track" aria-label={`Analisis final en progreso: ${finalLoadingProgress}%`}>
              <div className="quiz-loading__bar" style={{ width: `${finalLoadingProgress}%` }} />
            </div>
            <div className="quiz-loading__percent">{finalLoadingProgress}%</div>
            <ul className="quiz-checks" aria-live="polite">
              {currentFinalLoadingCopy.checks.slice(0, finalVisibleChecks).map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
            {sex && goal ? <QuizGoalTransformationMarquee sex={sex} goal={goal} /> : null}
          </div>
        </section>
      ) : finalVariant ? (
        <section className="quiz-final screen-enter">
          <div className="quiz-video-wrap">
            <iframe
              className="quiz-video"
              src={finalVariant.videoUrl}
              title={`Resultado ${resultDestination}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>

          <h1>¿QUÉ VAS A ENCONTRAR?</h1>

          <div className="quiz-video-wrap">
            <iframe
              className="quiz-video"
              src="https://player.vimeo.com/video/1197374012?title=0&byline=0&portrait=0&dnt=1"
              title="Que vas a encontrar"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <img className="quiz-final__image" src={finalVariant.imageUrl} alt={`Plan personalizado ${resultDestination}`} />

          <section className="quiz-plan">
            <p className="quiz-plan__eyebrow">Tu plan personalizado está listo</p>
            <h2>Programa Berich Completo</h2>
            <div className="quiz-plan__price-block">
              <p className="quiz-plan__price">{PROGRAM_USD_PRICE} USD</p>
              <p className="quiz-plan__price-trust">Pago Seguro</p>
              <p className="quiz-plan__price-sub">Puedes pagar en la moneda de tu país</p>
            </div>
            {checkoutError ? <div className="quiz-plan__error">{checkoutError}</div> : null}
            <button
              type="button"
              className="quiz-plan__button"
              onClick={() => void startCheckout()}
              disabled={checkoutBusy}
            >
              {checkoutBusy ? 'Redirigiendo al pago…' : 'Quiero empezar ahora'}
            </button>
            <p className="quiz-plan__note">Pago único. Acceso de por vida.</p>
          </section>

          <section className="quiz-faq">
            <h2>Preguntas frecuentes</h2>
            <div className="quiz-faq__list">
              {faqItems.map((item, index) => {
                const isOpen = openFaqIndex === index

                return (
                  <article className={'quiz-faq__item' + (isOpen ? ' quiz-faq__item--open' : '')} key={item.question}>
                    <button
                      className="quiz-faq__question"
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.question}</span>
                      <span className="quiz-faq__icon" aria-hidden="true">
                        +
                      </span>
                    </button>
                    <div className="quiz-faq__answer" aria-hidden={!isOpen}>
                      <p>{item.answer}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </section>
      ) : null}
    </main>
  )
}
