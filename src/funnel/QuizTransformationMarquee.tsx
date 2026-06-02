import { getTransformationImages, getTransformationImagesForGoal } from './transformationMarqueeImages'

type Props = {
  sex: 'hombre' | 'mujer'
}

type GoalProps = Props & {
  goal: 'Ganar músculo' | 'Perder grasa' | 'Recomposición corporal'
}

function MarqueeGroup({ images, prefix, withSpacer = true }: { images: string[]; prefix: string; withSpacer?: boolean }) {
  return (
    <div className="quiz-transform-marquee__group">
      {images.map((src) => (
        <img key={`${prefix}-${src}`} src={src} alt="" decoding="async" />
      ))}
      {withSpacer ? <span className="quiz-transform-marquee__spacer" aria-hidden="true" /> : null}
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

export function QuizGoalTransformationMarquee({ sex, goal }: GoalProps) {
  const images = getTransformationImagesForGoal(sex, goal)
  if (!images.length) return null

  return (
    <div className="quiz-transform-marquee quiz-transform-marquee--slow" aria-hidden="true">
      <div className="quiz-transform-marquee__track">
        <MarqueeGroup images={images} prefix="final-a" withSpacer={false} />
        <MarqueeGroup images={images} prefix="final-b" withSpacer={false} />
      </div>
    </div>
  )
}
