/**
 * Jina+Gemini フォールバックパスの動作確認用スクリプト
 * 使用方法: npx tsx scripts/test-jina-extract.ts <URL>
 */

import { fetchPageContent } from '../src/lib/scraper/jina-reader'
import { extractRecipeInfo } from '../src/lib/llm/extract-recipe'

async function main() {
  const url = process.argv[2]
  if (!url) {
    console.error('Usage: npx tsx scripts/test-jina-extract.ts <URL>')
    process.exit(1)
  }

  console.log('Fetching via Jina:', url)
  const { content, title, isVideo } = await fetchPageContent(url)

  if (isVideo || !content) {
    console.log('isVideo or no content, skipping')
    return
  }

  console.log('Jina title:', title)
  console.log('Content length:', content.length)
  console.log('Content preview (first 300 chars):\n', content.slice(0, 300))

  console.log('\nExtracting with Gemini...')
  const extraction = await extractRecipeInfo(content, url)

  console.log('\n=== Gemini extraction result ===')
  console.log('title:', extraction.title)
  console.log('cookingTimeMinutes:', extraction.cookingTimeMinutes)
  console.log('mainIngredients:', extraction.mainIngredients)
}

main().catch(console.error)
