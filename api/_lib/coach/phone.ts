/** Normaliza teléfono a E.164 básico (Uruguay/LATAM sin espacios). */
export function normalizePhoneE164(raw: string, defaultCountry = '598'): string | null {
  let digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return null

  if (digits.startsWith('+')) {
    digits = digits.slice(1)
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0')) {
    digits = `${defaultCountry}${digits.slice(1)}`
  } else if (digits.length <= 10 && defaultCountry) {
    digits = `${defaultCountry}${digits}`
  }

  if (!/^\d{8,15}$/.test(digits)) return null
  return `+${digits}`
}
