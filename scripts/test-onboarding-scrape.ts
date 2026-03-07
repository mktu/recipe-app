/**
 * オンボーディング用スクレイピング検証スクリプト
 *
 * 検索ページからレシピURLを抽出し、既存スクレイパーで解析できるかを確認する
 *
 * 使用方法:
 *   npx tsx scripts/test-onboarding-scrape.ts [検索クエリ] [サイト]
 *
 * 例:
 *   npx tsx scripts/test-onboarding-scrape.ts "鶏肉 時短"
 *   npx tsx scripts/test-onboarding-scrape.ts "豚肉" nadia
 *   npx tsx scripts/test-onboarding-scrape.ts "簡単 野菜" delishkitchen
 */

import { fetchHtml } from '../src/lib/scraper/html-fetcher'
import { extractRecipeFromJsonLd } from '../src/lib/scraper/json-ld-extractor'
import { extractRecipeFromNextData } from '../src/lib/scraper/next-data-extractor'

const SITES = {
  delishkitchen: {
    name: 'DELISH KITCHEN',
    searchUrl: (query: string) =>
      `https://delishkitchen.tv/search?q=${encodeURIComponent(query)}`,
    urlPattern: /https:\/\/delishkitchen\.tv\/recipes\/\d+/g,
  },
  nadia: {
    name: 'Nadia',
    searchUrl: (query: string) =>
      `https://oceans-nadia.com/search?keyword=${encodeURIComponent(query)}`,
    urlPattern: /\/user\/\d+\/recipe\/\d+/g,
    urlPrefix: 'https://oceans-nadia.com',
  },
}

type SiteKey = keyof typeof SITES

async function scrapeSearchResults(siteKey: SiteKey, query: string): Promise<string[]> {
  const site = SITES[siteKey]
  const searchUrl = site.searchUrl(query)

  console.log(`\n🔍 検索URL: ${searchUrl}`)

  const start = Date.now()
  const { html } = await fetchHtml(searchUrl)
  console.log(`   HTML取得: ${Date.now() - start}ms (${html.length.toLocaleString()} bytes)`)

  const matches = html.match(site.urlPattern) || []
  const urls = [...new Set(matches)].map(url =>
    'urlPrefix' in site ? `${site.urlPrefix}${url}` : url
  )

  console.log(`   レシピURL抽出: ${urls.length}件`)
  return urls
}

async function parseRecipeUrl(url: string): Promise<{
  title?: string
  cookingTimeMinutes?: number | null
  ingredientCount?: number
  method: string
}> {
  const { html } = await fetchHtml(url)

  const jsonLd = extractRecipeFromJsonLd(html, url)
  if (jsonLd) {
    return {
      title: jsonLd.title,
      cookingTimeMinutes: jsonLd.cookingTimeMinutes,
      ingredientCount: jsonLd.ingredients.length,
      method: 'JSON-LD',
    }
  }

  const nextData = extractRecipeFromNextData(html)
  if (nextData) {
    return {
      title: nextData.title,
      cookingTimeMinutes: nextData.cookingTimeMinutes,
      method: '__NEXT_DATA__',
    }
  }

  return { method: '解析失敗' }
}

async function main() {
  const query = process.argv[2] || '鶏肉 簡単'
  const siteArg = process.argv[3] as SiteKey | undefined

  const targetSites: SiteKey[] = siteArg && siteArg in SITES
    ? [siteArg]
    : ['delishkitchen', 'nadia']

  console.log('🧪 オンボーディングスクレイピング検証')
  console.log('=====================================')
  console.log(`検索クエリ: "${query}"`)
  console.log(`対象サイト: ${targetSites.join(', ')}`)

  const totalStart = Date.now()

  for (const siteKey of targetSites) {
    const site = SITES[siteKey]
    console.log(`\n${'='.repeat(40)}`)
    console.log(`📌 ${site.name}`)
    console.log('='.repeat(40))

    let urls: string[] = []
    try {
      urls = await scrapeSearchResults(siteKey, query)
    } catch (e) {
      console.error(`   ❌ 検索ページ取得失敗: ${e instanceof Error ? e.message : e}`)
      continue
    }

    if (urls.length === 0) {
      console.log('   ⚠️  レシピURLが見つかりませんでした')
      continue
    }

    // 先頭5件のみ解析
    const sample = urls.slice(0, 5)
    console.log(`\n📋 先頭${sample.length}件を解析:`)

    for (const url of sample) {
      const start = Date.now()
      try {
        const result = await parseRecipeUrl(url)
        const elapsed = Date.now() - start
        const timeStr = result.cookingTimeMinutes ? `⏱ ${result.cookingTimeMinutes}分` : '⏱ -'
        const ingStr = result.ingredientCount ? `🍴 ${result.ingredientCount}品` : ''
        const status = result.title ? '✅' : '❌'
        console.log(`   ${status} [${result.method}] ${elapsed}ms`)
        console.log(`      タイトル: ${result.title ?? '取得失敗'}`)
        console.log(`      ${timeStr}  ${ingStr}`)
        console.log(`      URL: ${url}`)
      } catch (e) {
        console.error(`   ❌ 解析失敗 (${Date.now() - start}ms): ${url}`)
        console.error(`      ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  const totalElapsed = Date.now() - totalStart
  console.log(`\n${'='.repeat(40)}`)
  console.log(`⏱ 合計時間: ${totalElapsed}ms`)
  console.log('='.repeat(40))
}

main().catch(console.error)
