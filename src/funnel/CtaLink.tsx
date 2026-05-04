import type { CtaButton } from './types'

type Props = { cta: CtaButton; className?: string }

export function CtaLink({ cta, className }: Props) {
  const same = cta.sameTab !== false
  return (
    <a
      className={className}
      href={cta.href}
      {...(same ? {} : { target: '_blank', rel: 'noreferrer noopener' })}
    >
      {cta.label}
    </a>
  )
}
