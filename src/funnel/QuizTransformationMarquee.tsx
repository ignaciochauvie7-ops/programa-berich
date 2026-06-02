import { getTransformationImages } from './transformationMarqueeImages'

type Props = {
  sex: 'hombre' | 'mujer'
}

function MarqueeGroup({ images, prefix }: { images: string[]; prefix: string }) {
  return (
    <div className="quiz-transform-marquee__group">
      {images.map((src) => (
        <img key={`${prefix}-${src}`} src={src} alt="" decoding="async" />
      ))}
      <span className="quiz-transform-marquee__spacer" aria-hidden="true" />
    </div>
  )
}

export function QuizTransformationMarquee({ sex }: Props) {
  const images = getTransformationImages(sex)
  if (!images.length) return null

  return (
    <div className="quiz-transform-marquee" aria-hidden="true">
      <div className="quiz-transform-marquee__track">
        <MarqueeGroup images={images} prefix="a" />
        <MarqueeGroup images={images} prefix="b" />
      </div>
    </div>
  )
}
