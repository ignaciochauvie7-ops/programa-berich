/**
 * Reproduces Vercel's per-file API TypeScript check (root config without a proper project).
 * Fails the build if Node globals (Buffer, process, node:crypto) are not typed.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const apiDir = join(root, 'api')

function listTsFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...listTsFiles(full))
    } else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      out.push(full)
    }
  }
  return out
}

console.log('[verify-vercel-api] tsc -p api/tsconfig.json')
execFileSync('npx', ['tsc', '-p', 'api/tsconfig.json', '--noEmit'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

const rootConfig = JSON.parse(
  execFileSync('npx', ['tsc', '--showConfig', '-p', 'tsconfig.json'], {
    cwd: root,
    encoding: 'utf8',
    shell: true,
  }),
)

const types = rootConfig.compilerOptions?.types ?? []
if (!types.includes('node')) {
  console.error(
    '[verify-vercel-api] tsconfig.json must set compilerOptions.types to include "node" (Vercel uses root config).',
  )
  process.exit(1)
}

const tscArgs = [
  'tsc',
  '--ignoreConfig',
  '--noEmit',
  '--strict',
  '--skipLibCheck',
  '--esModuleInterop',
  '--types',
  'node',
  '--lib',
  'ES2022',
  '--module',
  'ESNext',
  '--moduleResolution',
  'bundler',
]

const files = listTsFiles(apiDir)
console.log(`[verify-vercel-api] per-file check (${files.length} files, like Vercel)`)

for (const file of files) {
  const rel = relative(root, file).replace(/\\/g, '/')
  try {
    execFileSync('npx', [...tscArgs, rel], { cwd: root, stdio: 'pipe', shell: true })
  } catch (err) {
    const out = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '')
    console.error(`[verify-vercel-api] FAILED: ${rel}\n${out}`)
    process.exit(1)
  }
}

console.log('[verify-vercel-api] OK')
