import type { ParsedRecipe } from '@/types/recipe'
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
 * URLからレシピ情報を解析する
 *
 * 処理フロー:
 * 1. Jina Reader でURLからコンテンツ取得
 * 2. Gemini で構造化データ抽出
 * 3. 食材名を ingredients/ingredient_aliases で正規化
 */
export async function parseRecipe(url: string): Promise<ParsedRecipe> {
  try {
    // Step 1: コンテンツ取得
    const { content, title: pageTitle, isVideo } = await fetchPageContent(url)

    // 動画系URLは空の結果を返す（手動入力を促す）
    if (isVideo) {
      return createEmptyResult(url)
    }

    // コンテンツが取得できなかった場合
    if (!content) {
      return createEmptyResult(url)
    }

    // Step 2: LLM で抽出
    const extraction = await extractRecipeInfo(content, url)

    // Step 3: 食材マッチング
    const matchedIngredients = await matchIngredients(extraction.mainIngredients)

    return {
      title: extraction.title || pageTitle,
      sourceName: extraction.sourceName || extractDomainName(url),
      imageUrl: extraction.imageUrl || '',
      ingredientIds: matchedIngredients.map((m) => m.ingredientId),
      memo: '',
    }
  } catch (error) {
    // エラー時は空の結果を返す（ユーザーに手動入力を促す）
    console.error('Recipe parsing failed:', error)

    if (error instanceof JinaReaderError) {
      console.error('Jina Reader error:', error.statusCode)
    }

    return createEmptyResult(url)
  }
}
