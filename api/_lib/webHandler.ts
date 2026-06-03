type VercelHeaders = Record<string, string | string[] | undefined>

type VercelRequest = {
  method?: string
  url?: string
  headers: VercelHeaders
  body?: unknown
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  send: (body: Buffer) => void
  json: (body: unknown) => void
}

function buildWebRequest(req: VercelRequest): Request {
  const host = String(req.headers.host ?? 'localhost')
  const proto = String(req.headers['x-forwarded-proto'] ?? 'https')
  const path = req.url ?? '/'
  const url = path.startsWith('http') ? path : `${proto}://${host}${path}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry))
    } else {
      headers.set(key, String(value))
    }
  }

  let body: string | undefined
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  }

  return new Request(url, {
    method: req.method,
    headers,
    body,
  })
}

function isWebRequest(req: unknown): req is Request {
  return (
    req instanceof Request ||
    (typeof req === 'object' &&
      req !== null &&
      typeof (req as Request).headers?.get === 'function' &&
      typeof (req as Request).arrayBuffer === 'function')
  )
}

/** Adapta handlers Web Request/Response al runtime de Vercel Node. */
export function webHandler(handler: (request: Request) => Promise<Response>) {
  return async (
    req: VercelRequest | Request,
    res?: VercelResponse,
  ): Promise<Response | void> => {
    if (isWebRequest(req)) {
      return handler(req)
    }

    if (!res) {
      throw new Error('Vercel response required')
    }

    try {
      const request = buildWebRequest(req)
      const response = await handler(request)
      const buffer = Buffer.from(await response.arrayBuffer())

      res.status(response.status)
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'content-length') return
        res.setHeader(key, value)
      })
      res.send(buffer)
    } catch (error) {
      console.error('[api]', error)
      res.status(500).json({ error: 'internal error' })
    }
  }
}
