type Sex = 'hombre' | 'mujer'
type Goal = 'Ganar músculo' | 'Perder grasa' | 'Recomposición corporal'

function toImageUrls(modules: Record<string, unknown>): string[] {
  return Object.values(modules)
    .map((module) => (module as { default?: string }).default)
    .filter((src): src is string => Boolean(src))
}

const imagenesGanarMusculoH = toImageUrls(import.meta.glob('../../supabase/Ganar musculo. H/*', { eager: true }))

const imagenesGanarMusculoM = toImageUrls(import.meta.glob('../../supabase/Ganar musculo. M/*', { eager: true }))

const imagenesPerderGrasaH = toImageUrls(import.meta.glob('../../supabase/Perder grasa. H/*', { eager: true }))

const imagenesPerderGrasaM = toImageUrls(import.meta.glob('../../supabase/Perder grasa. M/*', { eager: true }))

export function getTransformationImages(sex: Sex): string[] {
  const images =
    sex === 'hombre'
      ? [...imagenesGanarMusculoH, ...imagenesPerderGrasaH]
      : [...imagenesGanarMusculoM, ...imagenesPerderGrasaM]
  return [...new Set(images.filter(Boolean))]
}

export function getTransformationImagesForGoal(sex: Sex, goal: Goal): string[] {
  const isMuscleGoal = goal === 'Ganar músculo'
  const images =
    sex === 'hombre'
      ? isMuscleGoal
        ? imagenesGanarMusculoH
        : imagenesPerderGrasaH
      : isMuscleGoal
        ? imagenesGanarMusculoM
        : imagenesPerderGrasaM

  return [...new Set(images.filter(Boolean))]
}
