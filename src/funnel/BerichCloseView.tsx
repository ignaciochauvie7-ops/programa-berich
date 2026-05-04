import { useParams } from 'react-router-dom'
import type { BerichClosePlan, BerichCloseStep } from './types'
import { extractYoutubeVideoId, youtubeEmbedSrc } from './youtube'

type Props = {
  step: BerichCloseStep
}

function YoutubeEmbed({ url, title }: { url: string; title: string }) {
  const id = extractYoutubeVideoId(url)
  if (!id) {
    return <p className="funnel-error">URL de YouTube no válida.</p>
  }
  return (
    <div className="funnel-youtube funnel-berich-youtube">
      <iframe
        title={title}
        src={youtubeEmbedSrc(id, true)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}

function PriceBlock({ currency, plan }: { currency: 'uyu' | 'usd'; plan: BerichClosePlan }) {
  const primary = currency === 'uyu' ? plan.priceUyu : plan.priceUsd
  const secondary = currency === 'uyu' ? plan.priceUsd : plan.priceUyu
  return (
    <div className="funnel-berich-price">
      <span className="funnel-berich-price__main">{primary}</span>
      <span className="funnel-berich-price__sub">≈ {secondary}</span>
    </div>
  )
}

function PlanCard({
  currency,
  plan,
  featured,
}: {
  currency: 'uyu' | 'usd'
  plan: BerichClosePlan
  featured: boolean
}) {
  return (
    <div className={'funnel-berich-plan' + (featured ? ' funnel-berich-plan--featured' : '')}>
      {plan.badge ? <span className="funnel-berich-plan__badge">{plan.badge}</span> : null}
      <h3 className="funnel-berich-plan__name">{plan.name}</h3>
      <PriceBlock currency={currency} plan={plan} />
      {plan.whatsappExtra ? (
        <p className="funnel-berich-plan__extra">{plan.whatsappExtra}</p>
      ) : null}
      <ul className="funnel-berich-plan__bullets">
        {plan.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <a className="funnel-btn funnel-btn--primary funnel-berich-plan__cta" href={plan.ctaHref}>
        {plan.ctaLabel}
      </a>
    </div>
  )
}

function PricingDeck({
  currency,
  basic,
  plus,
}: {
  currency: 'uyu' | 'usd'
  basic: BerichClosePlan
  plus: BerichClosePlan
}) {
  return (
    <div className="funnel-berich-plans" aria-label="Planes y precios">
      <PlanCard currency={currency} plan={basic} featured={false} />
      <PlanCard currency={currency} plan={plus} featured />
    </div>
  )
}

function FaqSection({ items }: { items: BerichCloseStep['faq'] }) {
  return (
    <section className="funnel-berich-faq" aria-labelledby="berich-faq-title">
      <h2 id="berich-faq-title" className="funnel-berich-section-title">
        Preguntas frecuentes
      </h2>
      <div className="funnel-berich-faq__list">
        {items.map((item, i) => (
          <details key={i} className="funnel-berich-faq__item">
            <summary className="funnel-berich-faq__summary">{item.question}</summary>
            <p className="funnel-berich-faq__answer">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function TransformGrid({ images }: { images: BerichCloseStep['transformations'] }) {
  return (
    <section className="funnel-berich-transform" aria-label="Transformaciones">
      <h2 className="funnel-berich-section-title">Transformaciones reales</h2>
      <div className="funnel-berich-transform__grid">
        {images.map((im, i) => (
          <div key={im.src + i} className="funnel-berich-transform__cell">
            <img src={im.src} alt={im.alt ?? 'Transformación'} loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function BerichCloseView({ step }: Props) {
  const { slug = '' } = useParams<{ slug: string }>()
  const restart = `/f/${slug || 'entrenamiento'}?restart=1`

  return (
    <div className="funnel-berich">
      <header className="funnel-berich__hero">
        <p className="funnel-berich__kicker">Programa Berich</p>
        <h1 className="funnel-berich__title">Tu transformación empieza acá</h1>
      </header>

      <YoutubeEmbed url={step.videoIntroUrl} title="Video de introducción" />

      <section className="funnel-berich-block">
        <h2 className="funnel-berich-section-title">¿Qué vas a encontrar adentro?</h2>
        <YoutubeEmbed url={step.videoInsideUrl} title="Qué incluye el programa" />
      </section>

      <figure className="funnel-berich-highlight">
        <img src={step.highlightImage.src} alt={step.highlightImage.alt ?? 'Programa Berich'} loading="lazy" />
      </figure>

      <section className="funnel-berich-block">
        <PricingDeck currency={step.currency} basic={step.basicPlan} plus={step.plusPlan} />
      </section>

      <TransformGrid images={step.transformations} />

      <section className="funnel-berich-block funnel-berich-block--repeat">
        <h2 className="funnel-berich-section-title funnel-berich-section-title--sub">Elegí tu plan</h2>
        <PricingDeck currency={step.currency} basic={step.basicPlan} plus={step.plusPlan} />
      </section>

      <FaqSection items={step.faq} />

      <p className="funnel-berich-restart">
        <a className="funnel-btn funnel-btn--ghost" href={restart}>
          Volver a empezar el formulario
        </a>
      </p>
    </div>
  )
}
