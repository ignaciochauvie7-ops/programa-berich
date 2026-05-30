export function FunnelsPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Funnels</h1>
      </header>

      <div className="admin-card admin-card--empty">
        <div className="admin-card__top">
          <h2>Metodo Berich</h2>
          <span className="admin-pill">Publicado</span>
        </div>
        <p className="admin-card__meta">Link publico del funnel, sin acceso al programa ni al panel privado.</p>
        <div className="admin-card__actions">
          <a className="admin-btn admin-btn--primary" href="/funnel/metodo-berich" target="_blank" rel="noreferrer">
            Ver funnel publico
          </a>
        </div>
      </div>
    </section>
  )
}
