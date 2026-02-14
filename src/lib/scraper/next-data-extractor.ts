/**
 * Next.js __NEXT_DATA__ からのレシピ抽出
 *
 * Nadia等のNext.jsベースのサイトで、JSON-LDがクライアントサイドで
 * 動的に挿入される場合のフォールバック
 */

import type { JsonLdExtraction } from '@/types/json-ld'

/**
 * Nadiaのレシピデータ構造
 */
interface NadiaRecipe {
  title?: string
  ingredients?: Array<{
    name?: string
    amount?: string
  }>
  imageSet?: Array<{
    path?: string
  }>
}

/**
 * __NEXT_DATA__のページProps構造
 */
interface NextDataPageProps {
  data?: {
    publishedRecipe?: NadiaRecipe
  }
}

/**
 * HTMLから__NEXT_DATA__スクリプトを抽出
 */
function extractNextDataScript(html: string): unknown | null {
  const pattern =
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i
  const match = pattern.exec(html)

  if (!match?.[1]) return null

  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/**
 * Nadiaの画像URLを構築
 */
function buildNadiaImageUrl(path: string | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `https://asset.oceans-nadia.com${path}`
}

/**
 * 食材名から分量部分を除去
 */
function extractIngredientName(name: string): string {
  return name
    .replace(/\s*[\(（].*?[\)）]\s*$/, '') // 末尾の括弧を除去
    .trim()
}

/**
 * __NEXT_DATA__からNadiaのレシピオブジェクトを取得
 */
function getNadiaRecipeFromNextData(data: unknown): NadiaRecipe | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>
  const props = obj['props'] as Record<string, unknown> | undefined
  const pageProps = props?.['pageProps'] as NextDataPageProps | undefined

  return pageProps?.data?.publishedRecipe ?? null
}

/**
 * Nadiaのレシピから食材リストを抽出
 */
function extractNadiaIngredients(recipe: NadiaRecipe): string[] {
  if (!recipe.ingredients?.length) return []

  return recipe.ingredients
    .map((i) => extractIngredientName(i.name || ''))
    .filter((name) => name.length > 0)
}

/**
 * Nadiaのレシピデータを抽出
 */
function extractNadiaRecipe(data: unknown): JsonLdExtraction | null {
  const recipe = getNadiaRecipeFromNextData(data)
  if (!recipe?.title) return null

  const ingredients = extractNadiaIngredients(recipe)
  if (ingredients.length === 0) return null

  const imageUrl = buildNadiaImageUrl(recipe.imageSet?.[0]?.path)

  return {
    title: recipe.title,
    sourceName: 'Nadia',
    imageUrl,
    ingredients,
  }
}

/**
 * HTMLから__NEXT_DATA__経由でレシピを抽出
 * @returns 抽出結果、または見つからない場合はnull
 */
export function extractRecipeFromNextData(html: string): JsonLdExtraction | null {
  const nextData = extractNextDataScript(html)
  if (!nextData) return null

  // Nadia形式を試す
  const nadiaRecipe = extractNadiaRecipe(nextData)
  if (nadiaRecipe) return nadiaRecipe

  // 他のNext.jsサイト形式は将来追加可能

  return null
}
