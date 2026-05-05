import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { persistLessonCompletion, progressPercent, readLessonCompletion } from '../dashboard/programLessonStorage'
import {
  berichModules,
  buildLessonKey,
  INTRO_VIDEO_ID,
  module1Videos,
  module2Videos,
  module3ExerciseVideos,
  module3RoutineVideos,
  module4Videos,
  module5Videos,
  module6Videos,
  MODULE3_BRANCH_KEYS,
  MODULE_LESSON_KEYS,
  type LessonVideo,
} from './berichProgramData'

type LessonVideoSectionProps = {
  heading: string
  subheading: string
  videos: LessonVideo[]
  moduleId: string
  section: '3a' | '3b' | null
  iframeTitlePrefix: string
  completedLessons: Set<string>
  onToggleLesson: (key: string) => void
  onBack: () => void
  backLabel: string
  onHome: () => void
  topActions?: ReactNode
}

function LessonVideoSection({
  heading,
  subheading,
  videos,
  moduleId,
  section,
  iframeTitlePrefix,
  completedLessons,
  onToggleLesson,
  onBack,
  backLabel,
  onHome,
  topActions,
}: LessonVideoSectionProps) {
  return (
    <section className="admin-page">
      <div className="admin-card__actions">
        {topActions ?? (
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onBack}>
            {backLabel}
          </button>
        )}
      </div>
      <article className="admin-card">
        <h2>{heading}</h2>
        <p className="admin-card__meta">{subheading}</p>
      </article>
      <div className="admin-cards admin-cards--lessons">
        {videos.map((video) => {
          const key = buildLessonKey(moduleId, section, video.id)
          const done = completedLessons.has(key)
          return (
            <article
              key={video.id}
              id={`lesson-${moduleId}-${section ?? 'main'}-${video.id}`}
              className="admin-card admin-card--lesson"
            >
              <h3 className="admin-lesson-title">{video.title}</h3>
              <div className="admin-video-embed admin-video-embed--large">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}?rel=0`}
                  title={`${iframeTitlePrefix} - ${video.title}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className="admin-lesson-actions">
                <button
                  type="button"
                  className={'admin-btn admin-btn--lesson-done' + (done ? ' admin-btn--lesson-done--on' : '')}
                  onClick={() => onToggleLesson(key)}
                >
                  {done ? 'Completado' : 'Marcar como terminado'}
                </button>
                <button type="button" className="admin-btn admin-btn--ghost admin-btn--lesson-home" onClick={() => onHome()}>
                  Volver al inicio
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export type BerichProgramViewProps = {
  /** Namespace para progreso en localStorage (ej. id de usuario de Supabase). Vacío = clave legacy de admin. */
  progressNamespace?: string
  variant: 'admin' | 'student'
}

export function BerichProgramView({ progressNamespace, variant }: BerichProgramViewProps) {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [activeModule3Section, setActiveModule3Section] = useState<'3a' | '3b' | null>(null)
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() =>
    readLessonCompletion(progressNamespace),
  )

  const activeModule = useMemo(() => berichModules.find((m) => m.id === activeModuleId) ?? null, [activeModuleId])

  const toggleLessonCompletion = useCallback(
    (key: string) => {
      setCompletedLessons((prev) => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        persistLessonCompletion(next, progressNamespace)
        return next
      })
    },
    [progressNamespace],
  )

  const goToModulesHome = useCallback(() => {
    setActiveModule3Section(null)
    setActiveModuleId(null)
  }, [])

  const moduleProgress = useCallback(
    (moduleId: string) => progressPercent(MODULE_LESSON_KEYS[moduleId] ?? [], completedLessons),
    [completedLessons],
  )

  const branchProgress = useCallback(
    (branch: '3a' | '3b') => progressPercent(MODULE3_BRANCH_KEYS[branch], completedLessons),
    [completedLessons],
  )

  const showingModule3Branches = activeModule?.id === 'm3' && activeModule3Section === null
  const showingModule3Exercises = activeModule?.id === 'm3' && activeModule3Section === '3a'
  const showingModule3Routines = activeModule?.id === 'm3' && activeModule3Section === '3b'
  const showingIntroVideo = activeModule?.id === 'm0'
  const showingModule1Videos = activeModule?.id === 'm1'
  const showingModule2Videos = activeModule?.id === 'm2'
  const showingModule4Videos = activeModule?.id === 'm4'
  const showingModule5Videos = activeModule?.id === 'm5'
  const showingModule6Videos = activeModule?.id === 'm6'

  const lessonBody =
    showingIntroVideo ? (
      <LessonVideoSection
        heading="INTRODUCCIÓN"
        subheading="Video de bienvenida del programa."
        videos={[{ id: INTRO_VIDEO_ID, title: 'Bienvenida al programa' }]}
        moduleId="m0"
        section={null}
        iframeTitlePrefix="Introduccion"
        completedLessons={completedLessons}
        onToggleLesson={toggleLessonCompletion}
        onBack={goToModulesHome}
        onHome={goToModulesHome}
        backLabel="← Volver a modulos"
      />
    ) : showingModule1Videos ? (
      <LessonVideoSection
        heading="MODULO 1 - Mentalidad operativa y expectativas reales"
        subheading="Lecciones en video del modulo."
        videos={module1Videos}
        moduleId="m1"
        section={null}
        iframeTitlePrefix="Modulo 1"
        completedLessons={completedLessons}
        onToggleLesson={toggleLessonCompletion}
        onBack={goToModulesHome}
        onHome={goToModulesHome}
        backLabel="← Volver a modulos"
      />
    ) : showingModule2Videos ? (
      <LessonVideoSection
        heading="MODULO 2 - Entender como funciona tu cuerpo (la logica detras de todo)"
        subheading="Lecciones en video del modulo."
        videos={module2Videos}
        moduleId="m2"
        section={null}
        iframeTitlePrefix="Modulo 2"
        completedLessons={completedLessons}
        onToggleLesson={toggleLessonCompletion}
        onBack={goToModulesHome}
        onHome={goToModulesHome}
        backLabel="← Volver a modulos"
      />
    ) : showingModule4Videos ? (
      <LessonVideoSection
        heading="MODULO 4 - Alimentacion inteligente"
        subheading="Lecciones en video del modulo."
        videos={module4Videos}
        moduleId="m4"
        section={null}
        iframeTitlePrefix="Modulo 4"
        completedLessons={completedLessons}
        onToggleLesson={toggleLessonCompletion}
        onBack={goToModulesHome}
        onHome={goToModulesHome}
        backLabel="← Volver a modulos"
      />
    ) : showingModule5Videos ? (
      <LessonVideoSection
        heading="MODULO 5 - Seguimiento, ajustes y contexto real"
        subheading="Lecciones en video del modulo."
        videos={module5Videos}
        moduleId="m5"
        section={null}
        iframeTitlePrefix="Modulo 5"
        completedLessons={completedLessons}
        onToggleLesson={toggleLessonCompletion}
        onBack={goToModulesHome}
        onHome={goToModulesHome}
        backLabel="← Volver a modulos"
      />
    ) : showingModule6Videos ? (
      <LessonVideoSection
        heading="MODULO 6 - Errores / Mitos / Creencias que restan"
        subheading="Lecciones en video del modulo."
        videos={module6Videos}
        moduleId="m6"
        section={null}
        iframeTitlePrefix="Modulo 6"
        completedLessons={completedLessons}
        onToggleLesson={toggleLessonCompletion}
        onBack={goToModulesHome}
        onHome={goToModulesHome}
        backLabel="← Volver a modulos"
      />
    ) : showingModule3Exercises ? (
      <LessonVideoSection
        heading="MODULO 3A - Ejercicios y construccion del entrenamiento"
        subheading="Lecciones en video de ejercicios."
        videos={module3ExerciseVideos}
        moduleId="m3"
        section="3a"
        iframeTitlePrefix="Modulo 3A"
        completedLessons={completedLessons}
        onToggleLesson={toggleLessonCompletion}
        onBack={() => setActiveModule3Section(null)}
        onHome={goToModulesHome}
        backLabel="← Volver a modulo 3"
        topActions={
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setActiveModule3Section(null)}>
            ← Volver a modulo 3
          </button>
        }
      />
    ) : showingModule3Routines ? (
      <LessonVideoSection
        heading="MODULO 3B - Rutinas en base a tus objetivos"
        subheading="Lecciones en video de rutinas."
        videos={module3RoutineVideos}
        moduleId="m3"
        section="3b"
        iframeTitlePrefix="Modulo 3B"
        completedLessons={completedLessons}
        onToggleLesson={toggleLessonCompletion}
        onBack={() => setActiveModule3Section(null)}
        onHome={goToModulesHome}
        backLabel="← Volver a modulo 3"
        topActions={
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setActiveModule3Section(null)}>
            ← Volver a modulo 3
          </button>
        }
      />
    ) : showingModule3Branches ? (
      <section className="admin-page">
        <div className="admin-card__actions">
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => {
              setActiveModule3Section(null)
              setActiveModuleId(null)
            }}
          >
            ← Volver a modulos
          </button>
        </div>
        <div className="admin-program-grid admin-program-grid--branches">
          {activeModule.branches!.map((branch) => {
            const pct = branchProgress(branch.id)
            return (
              <button
                key={branch.id}
                type="button"
                className="admin-card admin-program-card admin-program-card--button"
                onClick={() => setActiveModule3Section(branch.id)}
              >
                <div
                  className="admin-program-card__cover admin-program-card__cover--image"
                  style={{ backgroundImage: `url(${branch.coverImage})` }}
                />
                <div className="admin-program-card__body">
                  <h3>
                    <span>{branch.label}</span>
                  </h3>
                  <div className="admin-program-card__progress">
                    <div className="admin-program-card__progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <small>{pct}% completado</small>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    ) : (
      <div className="admin-program-grid">
        {berichModules.map((module) => {
          const pct = moduleProgress(module.id)
          return (
            <button
              key={module.id}
              type="button"
              className={
                'admin-card admin-program-card admin-program-card--button' +
                (activeModuleId === module.id ? ' admin-program-card--active' : '')
              }
              onClick={() => {
                setActiveModule3Section(null)
                setActiveModuleId(module.id)
              }}
            >
              <div
                className="admin-program-card__cover admin-program-card__cover--image"
                style={{ backgroundImage: `url(${module.coverImage})` }}
              />
              <div className="admin-program-card__body">
                <h3>
                  {module.title}
                  {module.subtitle ? <span>{module.subtitle}</span> : null}
                </h3>
                <div className="admin-program-card__progress">
                  <div className="admin-program-card__progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <small>{pct}% completado</small>
              </div>
            </button>
          )
        })}
      </div>
    )

  if (variant === 'student') {
    return <div className="student-program__body">{lessonBody}</div>
  }

  return (
    <>
      <header className="admin-page__header">
        <h1>Programas</h1>
        <div className="admin-card__actions">
          <a className="admin-btn admin-btn--ghost" href="/programa/berich-completo" target="_blank" rel="noreferrer">
            Previsualizar vista alumno
          </a>
          <button type="button" className="admin-btn admin-btn--primary">
            Editar programa
          </button>
        </div>
      </header>

      <article className="admin-card admin-program-hero">
        <div className="admin-program-hero__top">
          <div>
            <h2>Programa Berich Completo</h2>
            <p>
              <strong>Vos estás en el centro de control</strong> (interno, sin login de alumno). Lo que ven los demás
              será <code>/programa/berich-completo</code> recién cuando publiques el flujo (Supabase + accesos); con{' '}
              <code>npm run dev</code> podés abrir ese link en otra pestaña para ver el diseño alumno sin pagos todavía.
            </p>
          </div>
          <span className="admin-pill">Publicado</span>
        </div>
        <div className="admin-program-hero__meta">
          <span>Modulos: 7</span>
          <span>Lecciones internas: 47</span>
          <span>Alumnos activos: 134</span>
        </div>
      </article>

      {lessonBody}
    </>
  )
}
