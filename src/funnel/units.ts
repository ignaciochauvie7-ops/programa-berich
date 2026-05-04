const CM_PER_IN = 2.54
const LB_PER_KG = 2.2046226218

/** Pies y pulgadas enteras (redondeo) a partir de cm. */
export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalInches = cm / CM_PER_IN
  let ft = Math.floor(totalInches / 12)
  let inch = Math.round(totalInches - ft * 12)
  if (inch >= 12) {
    ft += 1
    inch -= 12
  }
  if (inch < 0) {
    ft -= 1
    inch += 12
  }
  return { ft, inch }
}

export function formatFtIn(cm: number): string {
  const { ft, inch } = cmToFtIn(cm)
  return `${ft}′${inch}″`
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG
}

export function formatLbFromKg(kg: number): string {
  return `${Math.round(kgToLb(kg))} lb`
}
