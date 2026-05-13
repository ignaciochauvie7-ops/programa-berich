import { usePriceLocalization } from '../hooks/usePriceLocalization'

interface LocalizedPriceProps {
  /** Additional class for the wrapper span */
  className?: string
  /** Show "(= USD 49)" hint when price is in a foreign currency. Default: true */
  showUsdHint?: boolean
}

/**
 * Usage: <LocalizedPrice />
 * Fetches the visitor's local price via /api/price and renders it.
 * Falls back to USD 49 if the API is unavailable.
 */
export function LocalizedPrice({ className, showUsdHint = true }: LocalizedPriceProps) {
  const { price, loading } = usePriceLocalization()

  if (loading) {
    return (
      <span className={className} aria-busy="true">
        …
      </span>
    )
  }

  if (!price) {
    return <span className={className}>$49 USD</span>
  }

  const isUsd = price.currency === 'USD'

  return (
    <span className={className}>
      {price.symbol}&nbsp;{price.formatted}&nbsp;{price.currency}
      {showUsdHint && !isUsd && (
        <span
          style={{ opacity: 0.55, fontSize: '0.7em', marginLeft: '0.5em', fontWeight: 400 }}
        >
          (≈ USD 49)
        </span>
      )}
    </span>
  )
}
