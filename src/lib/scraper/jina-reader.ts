const JINA_READER_BASE_URL = 'https://r.jina.ai'
const TIMEOUT_MS = 30000

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'instagram.com', 'tiktok.com']

export interface JinaReaderResult {
  content: string
  title: string
  isVideo: boolean
}

export class JinaReaderError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'JinaReaderError'
  }
}

function isVideoUrl(url: string): boolean {
  return VIDEO_HOSTS.some((host) => url.includes(host))
}

export async function fetchPageContent(url: string): Promise<JinaReaderResult> {
  if (isVideoUrl(url)) {
    return { content: '', title: '', isVideo: true }
  }

  const jinaUrl = `${JINA_READER_BASE_URL}/${url}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'RecipeHub/1.0',
      },
    })

    if (!response.ok) {
      throw new JinaReaderError(
        `Jina Reader failed: ${response.status}`,
        response.status
      )
    }

    const content = await response.text()
    const title = extractTitleFromContent(content)

    return { content, title, isVideo: false }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new JinaReaderError('Request timed out')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

function extractTitleFromContent(content: string): string {
  const titleMatch = content.match(/^Title:\s*(.+)$/m)
  return titleMatch?.[1]?.trim() ?? ''
}
