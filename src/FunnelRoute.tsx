import { useParams } from 'react-router-dom'
import { FunnelPlayer } from './funnel/FunnelPlayer'

/** Remount player when slug changes so state resets without sync setState in effects. */
export function FunnelRoute() {
  const { slug } = useParams<{ slug: string }>()
  return <FunnelPlayer key={slug} />
}
