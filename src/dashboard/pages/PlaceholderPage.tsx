type Props = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>{title}</h1>
      </header>
      <article className="admin-card admin-card--empty">
        <p>{description}</p>
      </article>
    </section>
  )
}
