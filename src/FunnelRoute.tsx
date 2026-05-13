import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { FunnelPlayer } from './funnel/FunnelPlayer'

export const AFFILIATE_REF_KEY = 'berich_ref'

/** Remount player when slug changes so state resets without sync setState in effects. */
export function FunnelRoute() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('ref')?.trim()
    if (ref) sessionStorage.setItem(AFFILIATE_REF_KEY, ref)
  }, [searchParams])

  return <FunnelPlayer key={slug} />
}
