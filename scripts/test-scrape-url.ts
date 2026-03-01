/**
 * スクレイパー層の動作確認用スクリプト（Supabase不要）
 * 使用方法: npx tsx scripts/test-scrape-url.ts <URL>
 */

import { fetchHtml } from '../src/lib/scraper/html-fetcher'
import { extractRecipeFromJsonLd } from '../src/lib/scraper/json-ld-extractor'
import { extractRecipeFromNextData } from '../src/lib/scraper/next-data-extractor'

async function main() {
  const url = process.argv[2]
  if (!url) {
    console.error('Usage: npx tsx scripts/test-scrape-url.ts <URL>')
    process.exit(1)
  }

  console.log('Fetching:', url)
  const { html } = await fetchHtml(url)
  console.log('HTML length:', html.length)

  // JSON-LD 抽出結果
  const jsonLd = extractRecipeFromJsonLd(html, url)
  console.log('\n=== JSON-LD result ===')
  if (jsonLd) {
    console.log('title:', jsonLd.title)
    console.log('cookingTimeMinutes:', jsonLd.cookingTimeMinutes)
    console.log('ingredients count:', jsonLd.ingredients.length)
  } else {
    console.log('null (JSON-LD not found or no string ingredients)')
  }

  // __NEXT_DATA__ 抽出結果
  const nextData = extractRecipeFromNextData(html)
  console.log('\n=== __NEXT_DATA__ result ===')
  if (nextData) {
    console.log('title:', nextData.title)
    console.log('cookingTimeMinutes:', nextData.cookingTimeMinutes)
  } else {
    console.log('null')
  }

  // JSON-LD の cookTime / totalTime を生で確認
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  let found = false
  while ((match = pattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      const str = JSON.stringify(parsed)
      if (str.includes('"Recipe"') || str.includes("'Recipe'")) {
        found = true
        console.log('\n=== Raw JSON-LD (Recipe schema) ===')
        const printFields = (obj: Record<string, unknown>) => {
          for (const key of ['@type', 'cookTime', 'totalTime', 'prepTime', 'recipeIngredient']) {
            if (obj[key] !== undefined) {
              const val = Array.isArray(obj[key])
                ? `[array, length=${(obj[key] as unknown[]).length}]`
                : String(obj[key]).slice(0, 100)
              console.log(`  ${key}: ${val}`)
            }
          }
        }
        if (Array.isArray(parsed)) {
          parsed.forEach((item: unknown) => {
            if (item && typeof item === 'object') printFields(item as Record<string, unknown>)
          })
        } else if (parsed['@graph']) {
          for (const item of parsed['@graph'] as unknown[]) {
            if (item && typeof item === 'object') printFields(item as Record<string, unknown>)
          }
        } else {
          printFields(parsed as Record<string, unknown>)
        }
      }
    } catch {
      // invalid JSON
    }
  }
  if (!found) {
    console.log('\n(No Recipe JSON-LD block found in HTML)')
  }
}

main().catch(console.error)
