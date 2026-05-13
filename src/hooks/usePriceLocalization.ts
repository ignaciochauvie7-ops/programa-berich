import { useState, useEffect } from 'react'

export interface PriceData {
  usdPrice: number
  localPrice: number
  currency: string
  symbol: string
  formatted: string
  countryCode: string
  rate: number
  rateSource: 'live' | 'fallback'
}

const USD_FALLBACK: PriceData = {
  usdPrice: 49,
  localPrice: 49,
  currency: 'USD',
  symbol: '$',
  formatted: '49',
  countryCode: 'US',
  rate: 1,
  rateSource: 'fallback',
}

export function usePriceLocalization() {
  const [price, setPrice] = useState<PriceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetch('/api/price')
      .then(res => {
        if (!res.ok) throw new Error('price api error')
        return res.json() as Promise<PriceData>
      })
      .then(data => {
        if (!cancelled) {
          setPrice(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrice(USD_FALLBACK)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { price, loading }
}
