import type { ParsedRecipe } from '@/types/recipe'
import type { JsonLdExtraction } from '@/types/json-ld'
import { fetchHtml, HtmlFetchError } from '@/lib/scraper/html-fetcher'
import { extractRecipeFromJsonLd } from '@/lib/scraper/json-ld-extractor'
import { extractRecipeFromNextData } from '@/lib/scraper/next-data-extractor'
import { extractOgp } from '@/lib/scraper/ogp-extractor'
import { matchIngredients } from './match-ingredients'

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
 * HTMLからレシピを解析（JSON-LD → __NEXT_DATA__ → OGP）
 * @returns 解析結果。タイトルが取れなければ null
 */
async function parseHtml(html: string, url: string): Promise<ParsedRecipe | null> {
  // 構造化データの抽出は空文字のタイトルは弾くが、空白だけのものは通すのでここで弾く
  const structured = extractRecipeFromJsonLd(html, url) ?? extractRecipeFromNextData(html)
  if (structured?.title.trim()) return buildParsedRecipe(structured)

  // 構造化データが無いサイトの最終フォールバック。食材はユーザーが手動入力する
  const ogp = extractOgp(html, url)
  if (!ogp) return null
  return {
    title: ogp.title,
    sourceName: ogp.sourceName,
    imageUrl: ogp.imageUrl,
    ingredientIds: [],
    ingredientsRaw: [],
    memo: '',
    cookingTimeMinutes: null,
  }
}

/**
 * URLからレシピ情報を解析する
 *
 * 処理フロー:
 * 1. HTML を取得し、JSON-LD → __NEXT_DATA__ → OGP の順に抽出する
 * 2. 食材名をingredients/ingredient_aliasesで正規化
 *
 * 取得に失敗した（存在しない・404・ボット拒否・タイムアウトなど）か、タイトルが取れなかったときは
 * null を返し、呼び出し側で登録を断る。全項目を手入力させても URL を登録する意味が無いため（#242）
 */
export async function parseRecipe(url: string): Promise<ParsedRecipe | null> {
  try {
    const { html } = await fetchHtml(url)
    return await parseHtml(html, url)
  } catch (error) {
    if (error instanceof HtmlFetchError) {
      console.log(`HTML fetch failed (${error.statusCode ?? error.message})`)
    } else {
      console.error('Recipe parsing failed:', error)
    }
    return null
  }
}
