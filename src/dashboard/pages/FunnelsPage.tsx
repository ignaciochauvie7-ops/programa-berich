import { Link } from 'react-router-dom'
import { funnels } from '../mockData'

export function FunnelsPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Funnels</h1>
        <button type="button" className="admin-btn admin-btn--primary">
          Nuevo funnel
        </button>
      </header>
      <div className="admin-cards">
        {funnels.map((funnel) => (
          <article key={funnel.id} className="admin-card">
            <div className="admin-card__top">
              <h2>{funnel.name}</h2>
              <span className="admin-pill">{funnel.status}</span>
            </div>
            <p className="admin-card__meta">Slug: /f/{funnel.slug}</p>
            <p className="admin-card__meta">Actualizado: {funnel.updatedAt}</p>
            <div className="admin-card__actions">
              <Link to={`/control/funnels/${funnel.slug}/flujo`} className="admin-btn admin-btn--ghost">
                Flujo
              </Link>
              <Link to={`/control/funnels/${funnel.slug}/editor`} className="admin-btn admin-btn--ghost">
                Editor
              </Link>
              <button type="button" className="admin-btn admin-btn--ghost">
                Ver estadisticas
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
