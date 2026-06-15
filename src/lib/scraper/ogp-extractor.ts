/**
 * OGP (Open Graph Protocol) 抽出
 *
 * JSON-LD・__NEXT_DATA__ で構造化レシピデータが取れなかった場合の
 * 最終フォールバック。最低限タイトル・画像・サイト名を取得し、
 * 食材はユーザーが手動入力する想定。
 */

/**
 * OGPから抽出したメタ情報（食材は含まない）
 */
export interface OgpExtraction {
  title: string
  imageUrl: string
  sourceName: string
}

/**
 * URLからドメイン名を抽出してサイト名として使用
 */
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname
    const domain = hostname.replace(/^www\./, '')
    const name = domain.split('.')[0]
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return ''
  }
}

/**
 * HTMLエンティティをデコード（よく使われるものに限定）
 */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/**
 * <meta property="og:xxx"> または <meta name="og:xxx"> の content を抽出
 * property/name の前後どちらに content があっても拾えるようにする
 */
function extractMetaContent(html: string, property: string): string {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // content が property より後ろにあるパターン
  const after = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    'i'
  )
  // content が property より前にあるパターン
  const before = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
    'i'
  )
  const match = after.exec(html) ?? before.exec(html)
  return match?.[1] ? decodeHtmlEntities(match[1]).trim() : ''
}

/**
 * <title> タグからタイトルを抽出（og:title が無い場合のフォールバック）
 */
function extractTitleTag(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return match?.[1] ? decodeHtmlEntities(match[1]).trim() : ''
}

/**
 * HTMLからOGP情報を抽出
 * @returns タイトルが取得できれば抽出結果、取れなければnull
 */
export function extractOgp(html: string, sourceUrl: string): OgpExtraction | null {
  const title = extractMetaContent(html, 'og:title') || extractTitleTag(html)
  if (!title) return null

  const imageUrl = extractMetaContent(html, 'og:image')
  const sourceName =
    extractMetaContent(html, 'og:site_name') || extractDomainName(sourceUrl)

  return { title, imageUrl, sourceName }
}
