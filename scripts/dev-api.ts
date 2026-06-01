/**
 * Servidor local de /api para desarrollo (sin Vercel CLI).
 * Carga .env.local y enruta igual que Vercel.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const PORT = 3001
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadEnvLocal() {
  const path = join(ROOT, '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

loadEnvLocal()

type Handler = (request: Request) => Promise<Response>

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

async function toRequest(req: IncomingMessage, url: string): Promise<Request> {
  const body = await readBody(req)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
    else headers.set(key, value)
  }
  return new Request(url, {
    method: req.method ?? 'GET',
    headers,
    body: body?.length ? body : undefined,
  })
}

async function sendResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  const buf = Buffer.from(await response.arrayBuffer())
  res.end(buf)
}

async function resolveHandler(pathname: string): Promise<Handler | null> {
  const rel = pathname.replace(/^\/api\/?/, '').replace(/\/$/, '')
  const candidates = rel
    ? [join(ROOT, 'api', `${rel}.ts`), join(ROOT, 'api', rel, 'index.ts')]
    : []

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue
    const mod = (await import(pathToFileURL(filePath).href)) as { default?: Handler }
    if (typeof mod.default === 'function') return mod.default
  }
  return null
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    })
    res.end()
    return
  }

  try {
    const handler = await resolveHandler(url.pathname)
    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'not found' }))
      return
    }

    const request = await toRequest(req, url.toString())
    const response = await handler(request)
    if (!(response instanceof Response)) {
      throw new Error('Handler did not return a Response')
    }
    await sendResponse(res, response)
  } catch (err) {
    console.error('[dev-api]', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'internal error' }))
  }
})

server.listen(PORT, () => {
  console.log(`[dev-api] http://localhost:${PORT}/api (env from .env.local)`)
})
