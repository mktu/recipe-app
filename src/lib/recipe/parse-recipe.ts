import type { ParsedRecipe } from '@/types/recipe'
import { fetchHtml, HtmlFetchError } from '@/lib/scraper/html-fetcher'
import { extractRecipeFromJsonLd } from '@/lib/scraper/json-ld-extractor'
import { fetchPageContent, JinaReaderError } from '@/lib/scraper/jina-reader'
import { extractRecipeInfo } from '@/lib/llm/extract-recipe'
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
 * JSON-LD (schema.org/Recipe) を使用してレシピを解析
 * @returns 解析結果、または失敗時はnull
 */
async function parseWithJsonLd(url: string): Promise<ParsedRecipe | null> {
  try {
    const { html } = await fetchHtml(url)
    const extraction = extractRecipeFromJsonLd(html, url)

    if (!extraction) {
      console.log('No valid JSON-LD Recipe found, falling back to Jina+Gemini')
      return null
    }

    // JSON-LD抽出成功 - 食材マッチング
    const matchedIngredients = await matchIngredients(extraction.ingredients)

    return {
      title: extraction.title,
      sourceName: extraction.sourceName,
      imageUrl: extraction.imageUrl,
      ingredientIds: matchedIngredients.map((m) => m.ingredientId),
      memo: '',
    }
  } catch (error) {
    if (error instanceof HtmlFetchError) {
      console.log(`HTML fetch failed (${error.statusCode}), trying Jina Reader`)
    } else {
      console.error('JSON-LD extraction failed:', error)
    }
    return null
  }
}

/**
 * Jina Reader + Gemini を使用してレシピを解析（フォールバック）
 * @returns 解析結果、または失敗時はnull
 */
async function parseWithJinaGemini(url: string): Promise<ParsedRecipe | null> {
  const { content, title: pageTitle, isVideo } = await fetchPageContent(url)

  // 動画系URLは解析不可
  if (isVideo || !content) {
    return null
  }

  const extraction = await extractRecipeInfo(content, url)
  const matchedIngredients = await matchIngredients(extraction.mainIngredients)

  return {
    title: extraction.title || pageTitle,
    sourceName: extraction.sourceName || extractDomainName(url),
    imageUrl: extraction.imageUrl || '',
    ingredientIds: matchedIngredients.map((m) => m.ingredientId),
    memo: '',
  }
}

/**
 * URLからレシピ情報を解析する
 *
 * 処理フロー:
 * 1. まず JSON-LD (schema.org/Recipe) での抽出を試みる
 * 2. 失敗した場合は Jina Reader + Gemini にフォールバック
 * 3. 食材名を ingredients/ingredient_aliases で正規化
 */
export async function parseRecipe(url: string): Promise<ParsedRecipe> {
  try {
    // Strategy 1: JSON-LD抽出（高速・Jinaブロック回避）
    const jsonLdResult = await parseWithJsonLd(url)
    if (jsonLdResult) {
      console.log('Successfully parsed with JSON-LD')
      return jsonLdResult
    }

    // Strategy 2: Jina Reader + Gemini（フォールバック）
    const jinaResult = await parseWithJinaGemini(url)
    if (jinaResult) {
      console.log('Successfully parsed with Jina+Gemini')
      return jinaResult
    }

    // 両方失敗
    return createEmptyResult(url)
  } catch (error) {
    console.error('Recipe parsing failed:', error)

    if (error instanceof JinaReaderError) {
      console.error('Jina Reader error:', error.statusCode)
    }

    return createEmptyResult(url)
  }
}
