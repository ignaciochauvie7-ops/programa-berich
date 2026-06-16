/**
 * Genera iconos PWA desde la imagen de marca (quita fondo blanco).
 * Uso: npx tsx scripts/generate-pwa-icons.ts
 */
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SOURCE = join(ROOT, 'supabase', 'WhatsApp Image 2026-06-16 at 07.46.29.jpeg')
const OUT_DIR = join(ROOT, 'public', 'icons')

const SIZES = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
] as const

async function removeWhiteBackground(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    if (r > 238 && g > 238 && b > 238) {
      data[i + 3] = 0
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer()
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error('No se encontró la imagen fuente:', SOURCE)
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })

  const source = await removeWhiteBackground(await sharp(SOURCE).toBuffer())

  for (const { name, size } of SIZES) {
    const out = join(OUT_DIR, name)
    await sharp(source)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(out)
    console.log('✓', out)
  }
}

void main()
