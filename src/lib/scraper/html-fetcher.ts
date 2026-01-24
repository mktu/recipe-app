/**
 * HTML直接フェッチャー
 * Jina Readerを経由せずにHTMLを取得する
 */

const TIMEOUT_MS = 15000

export interface HtmlFetchResult {
  html: string
  contentType: string
}

export class HtmlFetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isBlocked?: boolean
  ) {
    super(message)
    this.name = 'HtmlFetchError'
  }
}

/**
 * URLからHTMLを直接取得する
 */
export async function fetchHtml(url: string): Promise<HtmlFetchResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.9',
      },
    })

    if (!response.ok) {
      throw new HtmlFetchError(
        `HTTP ${response.status}`,
        response.status,
        response.status === 403 || response.status === 451
      )
    }

    const contentType = response.headers.get('content-type') || ''
    const html = await response.text()

    return { html, contentType }
  } catch (error) {
    if (error instanceof HtmlFetchError) {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HtmlFetchError('Request timed out')
    }
    throw new HtmlFetchError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
