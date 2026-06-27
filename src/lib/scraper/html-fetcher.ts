/**
 * HTML直接フェッチャー
 * Jina Readerを経由せずにHTMLを取得する
 */

const TIMEOUT_MS = 15000

/** 同一ホストへの連続アクセスに設ける最小間隔（ミリ秒） */
const MIN_HOST_INTERVAL_MS = 1000

/**
 * ホストごとの「次にアクセス可能になる時刻」を保持する。
 * 取得はユーザー起点・単発のため厳密な分散レート制限は行わず、
 * 同一インスタンス内での同一ホスト連打を緩やかに抑える礼儀的なガード。
 * （serverless ではインスタンス間で状態は共有されない点に留意）
 */
const nextAllowedFetchByHost = new Map<string, number>()

/**
 * 同一ホストへのアクセスが最小間隔を下回る場合、必要な分だけ待機する。
 * 並行リクエストはスロットを予約することで順番に処理される。
 */
async function throttleHost(host: string): Promise<void> {
  const now = Date.now()
  const scheduled = Math.max(now, nextAllowedFetchByHost.get(host) ?? 0)
  nextAllowedFetchByHost.set(host, scheduled + MIN_HOST_INTERVAL_MS)
  const waitMs = scheduled - now
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
}

/** 連絡先（問い合わせ窓口）。サイト運営者が識別・連絡できるよう UA に含める */
const CONTACT_EMAIL = 'mushi9ui@gmail.com'

/**
 * 説明的な User-Agent を構築する。
 * 用途（ユーザー起点のレシピメタデータ取得）と連絡先を明示し、
 * 取得元サイトが識別・問い合わせできるようにする（検出回避はしない）。
 */
function buildUserAgent(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://github.com/mktu/recipe-app'
  return `RecipeHub-Bot/1.0 (+${appUrl}; user-requested recipe metadata fetch; contact: ${CONTACT_EMAIL})`
}

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
  try {
    await throttleHost(new URL(url).hostname)
  } catch {
    // URL が不正な場合はスロットリングをスキップ（後続の fetch でエラーになる）
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': buildUserAgent(),
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
