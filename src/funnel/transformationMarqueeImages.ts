type Sex = 'hombre' | 'mujer'

const hombreGanar = Object.values(
  import.meta.glob<string>('../../supabase/Ganar musculo. H/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
    eager: true,
    import: 'default',
  }),
)

const hombrePerder = Object.values(
  import.meta.glob<string>('../../supabase/Perder grasa. H/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
    eager: true,
    import: 'default',
  }),
)

const mujerGanar = Object.values(
  import.meta.glob<string>('../../supabase/Ganar musculo. H/Ganar musculo. M/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
    eager: true,
    import: 'default',
  }),
)

const mujerPerder = Object.values(
  import.meta.glob<string>('../../supabase/Perder grasa. M/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
    eager: true,
    import: 'default',
  }),
)

export function getTransformationImages(sex: Sex): string[] {
  const images = sex === 'hombre' ? [...hombreGanar, ...hombrePerder] : [...mujerGanar, ...mujerPerder]
  return [...new Set(images.filter(Boolean))]
}
