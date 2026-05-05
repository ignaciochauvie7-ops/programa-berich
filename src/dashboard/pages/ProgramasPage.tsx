import { useMemo, useState } from 'react'

const modules = [
  {
    id: 'm1',
    title: 'MODULO 1',
    subtitle: 'Mentalidad operativa y expectativas reales',
    progress: 0,
    cover: 'mindset',
  },
  {
    id: 'm2',
    title: 'MODULO 2',
    subtitle: 'Entender como funciona tu cuerpo (la logica detras de todo)',
    progress: 0,
    cover: 'body',
  },
  {
    id: 'm3',
    title: 'MODULO 3',
    subtitle: 'Entrenamiento',
    progress: 0,
    cover: 'training',
    branches: [
      'MODULO 3A - Ejercicios y construccion del entrenamiento',
      'MODULO 3B - Rutinas en base a tus objetivos',
    ],
  },
  {
    id: 'm4',
    title: 'MODULO 4',
    subtitle: 'Alimentacion inteligente',
    progress: 0,
    cover: 'nutrition',
  },
  {
    id: 'm5',
    title: 'MODULO 5',
    subtitle: 'Seguimiento, ajustes y contexto real',
    progress: 0,
    cover: 'tracking',
  },
  {
    id: 'm6',
    title: 'MODULO 6',
    subtitle: 'Errores / Mitos / Creencias que restan',
    progress: 0,
    cover: 'myths',
  },
]

export function ProgramasPage() {
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const activeModule = useMemo(() => modules.find((m) => m.id === activeModuleId) ?? null, [activeModuleId])

  const showingModule3Branches = activeModule?.id === 'm3'

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Programas</h1>
        <button type="button" className="admin-btn admin-btn--primary">
          Editar programa
        </button>
      </header>

      <article className="admin-card admin-program-hero">
        <div className="admin-program-hero__top">
          <div>
            <h2>Programa Berich Completo</h2>
            <p>Ruta principal para todos los alumnos activos.</p>
          </div>
          <span className="admin-pill">Publicado</span>
        </div>
        <div className="admin-program-hero__meta">
          <span>Modulos: 6</span>
          <span>Lecciones internas: 24</span>
          <span>Alumnos activos: 134</span>
        </div>
      </article>

      {showingModule3Branches ? (
        <section className="admin-page">
          <div className="admin-card__actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setActiveModuleId(null)}>
              ← Volver a modulos
            </button>
          </div>
          <div className="admin-program-grid admin-program-grid--branches">
            {activeModule.branches!.map((branch) => (
              <button key={branch} type="button" className="admin-card admin-program-card admin-program-card--button">
                <div className="admin-program-card__cover" />
                <div className="admin-program-card__body">
                  <h3>
                    <span>{branch}</span>
                  </h3>
                  <div className="admin-program-card__progress">
                    <div className="admin-program-card__progress-fill" style={{ width: '0%' }} />
                  </div>
                  <small>0% completado</small>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="admin-program-grid">
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={
                'admin-card admin-program-card admin-program-card--button' +
                (activeModuleId === module.id ? ' admin-program-card--active' : '')
              }
              onClick={() => setActiveModuleId(module.id)}
            >
              <div className={`admin-program-card__cover admin-program-card__cover--${module.cover}`} />
              <div className="admin-program-card__body">
                <h3>
                  {module.title}
                  <span>{module.subtitle}</span>
                </h3>
                <div className="admin-program-card__progress">
                  <div className="admin-program-card__progress-fill" style={{ width: `${module.progress}%` }} />
                </div>
                <small>{module.progress}% completado</small>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
