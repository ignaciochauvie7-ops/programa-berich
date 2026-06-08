import { webHandler } from './_lib/webHandler.js'
import { json } from './_lib/json.js'
import { getRequestUrl } from './_lib/requestUrl.js'
import { PROGRAM_USD_PRICE } from './_lib/programPrice.js'

const USD_PRICE = PROGRAM_USD_PRICE

interface CurrencyInfo {
  code: string
  symbol: string
  decimals: number
  locale: string
}

const COUNTRY_CURRENCY: Record<string, CurrencyInfo> = {
  AR: { code: 'ARS', symbol: '$', decimals: 0, locale: 'es-AR' },
  MX: { code: 'MXN', symbol: '$', decimals: 0, locale: 'es-MX' },
  CO: { code: 'COP', symbol: '$', decimals: 0, locale: 'es-CO' },
  CL: { code: 'CLP', symbol: '$', decimals: 0, locale: 'es-CL' },
  PE: { code: 'PEN', symbol: 'S/', decimals: 0, locale: 'es-PE' },
  UY: { code: 'UYU', symbol: '$', decimals: 0, locale: 'es-UY' },
  PY: { code: 'PYG', symbol: '₲', decimals: 0, locale: 'es-PY' },
  BO: { code: 'BOB', symbol: 'Bs.', decimals: 0, locale: 'es-BO' },
  BR: { code: 'BRL', symbol: 'R$', decimals: 0, locale: 'pt-BR' },
  EC: { code: 'USD', symbol: '$', decimals: 0, locale: 'es-EC' },
  VE: { code: 'USD', symbol: '$', decimals: 0, locale: 'es-VE' },
  US: { code: 'USD', symbol: '$', decimals: 0, locale: 'en-US' },
  CA: { code: 'CAD', symbol: 'CA$', decimals: 0, locale: 'en-CA' },
  ES: { code: 'EUR', symbol: '€', decimals: 0, locale: 'es-ES' },
  PT: { code: 'EUR', symbol: '€', decimals: 0, locale: 'pt-PT' },
  DE: { code: 'EUR', symbol: '€', decimals: 0, locale: 'de-DE' },
  FR: { code: 'EUR', symbol: '€', decimals: 0, locale: 'fr-FR' },
  IT: { code: 'EUR', symbol: '€', decimals: 0, locale: 'it-IT' },
  GB: { code: 'GBP', symbol: '£', decimals: 0, locale: 'en-GB' },
  AU: { code: 'AUD', symbol: 'A$', decimals: 0, locale: 'en-AU' },
  DO: { code: 'DOP', symbol: 'RD$', decimals: 0, locale: 'es-DO' },
  GT: { code: 'GTQ', symbol: 'Q', decimals: 0, locale: 'es-GT' },
  HN: { code: 'HNL', symbol: 'L', decimals: 0, locale: 'es-HN' },
  CR: { code: 'CRC', symbol: '₡', decimals: 0, locale: 'es-CR' },
  PA: { code: 'USD', symbol: '$', decimals: 0, locale: 'es-PA' },
  NI: { code: 'NIO', symbol: 'C$', decimals: 0, locale: 'es-NI' },
  SV: { code: 'USD', symbol: '$', decimals: 0, locale: 'es-SV' },
}

const USD_FALLBACK: CurrencyInfo = { code: 'USD', symbol: '$', decimals: 0, locale: 'en-US' }

/** Precio mostrado en el quiz: siempre entero, sin decimales. */
const DISPLAY_DECIMALS = 0

// In-memory cache: lives as long as the function instance is warm (best-effort)
let ratesCache: { rates: Record<string, number>; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

async function getUsdRates(): Promise<Record<string, number>> {
  const now = Date.now()
  if (ratesCache && now - ratesCache.fetchedAt < CACHE_TTL_MS) {
    return ratesCache.rates
  }

  const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
    headers: { 'User-Agent': 'berich-pricing/1.0' },
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`)

  const data = (await res.json()) as { rates: Record<string, number> }
  ratesCache = { rates: data.rates, fetchedAt: now }
  return data.rates
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  // ?country=AR override for local testing / preview
  const url = getRequestUrl(request)
  const countryOverride = url.searchParams.get('country')?.toUpperCase()
  const countryCode = (countryOverride ?? request.headers.get('x-vercel-ip-country') ?? 'US').toUpperCase()

  const currencyInfo = COUNTRY_CURRENCY[countryCode] ?? USD_FALLBACK

  let localPrice = USD_PRICE
  let rate = 1
  let rateSource: 'live' | 'fallback' = 'live'

  try {
    const rates = await getUsdRates()
    rate = rates[currencyInfo.code] ?? 1
    localPrice = USD_PRICE * rate
  } catch (err) {
    console.error('[price] exchange rate fetch failed:', err)
    rateSource = 'fallback'
  }

  const roundedPrice = Math.round(localPrice)

  const formatted = new Intl.NumberFormat(currencyInfo.locale, {
    minimumFractionDigits: DISPLAY_DECIMALS,
    maximumFractionDigits: DISPLAY_DECIMALS,
  }).format(roundedPrice)

  return json({
    usdPrice: USD_PRICE,
    localPrice: roundedPrice,
    currency: currencyInfo.code,
    symbol: currencyInfo.symbol,
    formatted,
    countryCode,
    rate,
    rateSource,
  })
}

export default webHandler(handler)
