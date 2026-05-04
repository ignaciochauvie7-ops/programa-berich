import type { MediaBlock } from './types'

type Props = { media?: MediaBlock }

export function MediaBlockView({ media }: Props) {
  if (!media) return null
  if (media.kind === 'image') {
    return (
      <figure className="funnel-media funnel-media--image">
        <img src={media.src} alt={media.alt ?? ''} loading="lazy" decoding="async" />
      </figure>
    )
  }
  return (
    <figure className="funnel-media funnel-media--video">
      <video src={media.src} controls playsInline poster={media.poster} preload="metadata" />
    </figure>
  )
}
