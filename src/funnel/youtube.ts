const PATTERNS: RegExp[] = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/,
]

export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  for (const re of PATTERNS) {
    const m = trimmed.match(re)
    if (m?.[1]) return m[1]
  }
  return null
}

export function youtubeEmbedSrc(videoId: string, nocookie = true): string {
  const host = nocookie ? 'www.youtube-nocookie.com' : 'www.youtube.com'
  return `https://${host}/embed/${videoId}?rel=0`
}
