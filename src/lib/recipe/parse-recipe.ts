import type { ParsedRecipe } from '@/types/recipe'
import type { JsonLdExtraction } from '@/types/json-ld'
import { fetchHtml, HtmlFetchError } from '@/lib/scraper/html-fetcher'
import { extractRecipeFromJsonLd } from '@/lib/scraper/json-ld-extractor'
import { extractRecipeFromNextData } from '@/lib/scraper/next-data-extractor'
import { extractOgp } from '@/lib/scraper/ogp-extractor'
import { matchIngredients } from './match-ingredients'

/**
 * URLからドメイン名を抽出
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
 * 空の解析結果を生成
 */
function createEmptyResult(url: string): ParsedRecipe {
  return {
    title: '',
    sourceName: extractDomainName(url),
    imageUrl: '',
    ingredientIds: [],
    memo: '',
  }
}

/**
 * 抽出結果からParsedRecipeを生成
 */
async function buildParsedRecipe(
  extraction: JsonLdExtraction
): Promise<ParsedRecipe> {
  const matchedIngredients = await matchIngredients(extraction.ingredients)

  return {
    title: extraction.title,
    sourceName: extraction.sourceName,
    imageUrl: extraction.imageUrl,
    ingredientIds: matchedIngredients.map((m) => m.ingredientId),
    ingredientsRaw: extraction.ingredients.map((name) => ({ name, amount: '' })),
    memo: '',
    cookingTimeMinutes: extraction.cookingTimeMinutes ?? null,
  }
}

/**
 * HTMLから直接レシピを解析（JSON-LD → __NEXT_DATA__）
 * @returns 解析結果、または失敗時はnull
 */
async function parseWithHtmlFetch(url: string): Promise<ParsedRecipe | null> {
  try {
    const { html } = await fetchHtml(url)

    // Strategy 1: JSON-LD (schema.org/Recipe)
    const jsonLdExtraction = extractRecipeFromJsonLd(html, url)
    if (jsonLdExtraction) {
      console.log('Successfully extracted with JSON-LD')
      return buildParsedRecipe(jsonLdExtraction)
    }

    // Strategy 2: __NEXT_DATA__ (Nadia等のNext.jsサイト)
    const nextDataExtraction = extractRecipeFromNextData(html)
    if (nextDataExtraction) {
      console.log('Successfully extracted with __NEXT_DATA__')
      return buildParsedRecipe(nextDataExtraction)
    }

    // Strategy 3: OGP (構造化データが無いサイトの最終フォールバック)
    // タイトル・画像・サイト名のみ取得し、食材はユーザーが手動入力する
    const ogpExtraction = extractOgp(html, url)
    if (ogpExtraction) {
      console.log('Extracted title from OGP')
      return {
        title: ogpExtraction.title,
        sourceName: ogpExtraction.sourceName,
        imageUrl: ogpExtraction.imageUrl,
        ingredientIds: [],
        ingredientsRaw: [],
        memo: '',
        cookingTimeMinutes: null,
      }
    }

    console.log('No structured data found')
    return null
  } catch (error) {
    if (error instanceof HtmlFetchError) {
      console.log(`HTML fetch failed (${error.statusCode})`)
    } else {
      console.error('HTML extraction failed:', error)
    }
    return null
  }
}

/**
 * URLからレシピ情報を解析する
 *
 * 処理フロー:
 * 1. HTML直接取得でJSON-LD抽出を試みる
 * 2. 失敗したら__NEXT_DATA__抽出を試みる（Nadia等）
 * 3. それも失敗したらOGPからタイトル・画像・サイト名を取得（食材は手動入力）
 * 4. いずれも取得できない場合は空の結果を返す（ユーザーが手動入力）
 * 5. 食材名をingredients/ingredient_aliasesで正規化
 */
export async function parseRecipe(url: string): Promise<ParsedRecipe> {
  try {
    const htmlFetchResult = await parseWithHtmlFetch(url)
    if (htmlFetchResult) {
      return htmlFetchResult
    }

    return createEmptyResult(url)
  } catch (error) {
    console.error('Recipe parsing failed:', error)
    return createEmptyResult(url)
  }
}
