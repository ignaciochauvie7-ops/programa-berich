type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function generateCoachReply(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return { ok: false, error: 'openai not configured' }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }]

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 320,
        temperature: 0.7,
      }),
    })

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
      error?: { message?: string }
    }

    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `openai ${res.status}` }
    }

    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) return { ok: false, error: 'empty openai response' }

    return { ok: true, text }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'openai request failed'
    return { ok: false, error: message }
  }
}
