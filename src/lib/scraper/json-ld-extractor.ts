/**
 * JSON-LD (schema.org/Recipe) 抽出
 *
 * schema-dtsの型は参照用。実際の抽出はランタイムで安全に行う。
 */

import type { JsonLdExtraction } from '@/types/json-ld'

/**
 * JSON-LDから抽出したRecipeの内部表現
 * schema-dtsのRecipe型は複雑なため、実用的な型を定義
 */
interface ParsedRecipeJsonLd {
  name: string
  image?: unknown
  recipeIngredient?: string[]
  publisher?: unknown
  cookTime?: unknown
  totalTime?: unknown
}

/**
 * HTMLからすべてのJSON-LDブロックを抽出
 */
function extractJsonLdBlocks(html: string): unknown[] {
  const pattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const blocks: unknown[] = []
  let match

  while ((match = pattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      blocks.push(parsed)
    } catch {
      // Invalid JSON, skip
    }
  }

  return blocks
}

/**
 * @typeがRecipeかどうかを判定
 */
function isRecipeType(type: unknown): boolean {
  if (type === 'Recipe') return true
  if (Array.isArray(type) && type.includes('Recipe')) return true
  return false
}

/**
 * 値が文字列配列かどうかを判定
 */
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  )
}

/**
 * @graph配列内からRecipeを検索
 */
function findRecipeInGraph(graph: unknown[]): ParsedRecipeJsonLd | null {
  for (const item of graph) {
    if (item && typeof item === 'object') {
      const itemObj = item as Record<string, unknown>
      if (isRecipeType(itemObj['@type'])) {
        return parseRecipeObject(itemObj)
      }
    }
  }
  return null
}

/**
 * 配列内からRecipeを再帰検索
 */
function findRecipeInArray(arr: unknown[]): ParsedRecipeJsonLd | null {
  for (const item of arr) {
    const result = findRecipeSchema(item)
    if (result) return result
  }
  return null
}

/**
 * JSON-LDデータからRecipeスキーマを検索・パース
 * 直接Recipe、@graph配列、ルート配列に対応
 */
function findRecipeSchema(data: unknown): ParsedRecipeJsonLd | null {
  if (!data || typeof data !== 'object') return null

  // ルートが配列の場合
  if (Array.isArray(data)) {
    return findRecipeInArray(data)
  }

  const obj = data as Record<string, unknown>

  // 直接Recipeの場合
  if (isRecipeType(obj['@type'])) {
    return parseRecipeObject(obj)
  }

  // @graph配列内を検索
  if (Array.isArray(obj['@graph'])) {
    return findRecipeInGraph(obj['@graph'])
  }

  return null
}

/**
 * ISO 8601 duration（例: PT20M, PT1H30M, PT1H, PT1200S）を分に変換
 * 0以下の場合はnullを返す
 */
function parseIso8601Duration(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value)
  if (!match) return null
  const hours = parseInt(match[1] ?? '0', 10)
  const minutes = parseInt(match[2] ?? '0', 10)
  const seconds = parseInt(match[3] ?? '0', 10)
  const total = hours * 60 + minutes + Math.round(seconds / 60)
  return total > 0 ? total : null
}

/**
 * RecipeオブジェクトをパースしてParsedRecipeJsonLdに変換
 */
function parseRecipeObject(obj: Record<string, unknown>): ParsedRecipeJsonLd | null {
  const name = obj['name']
  if (typeof name !== 'string' || !name) return null

  const recipeIngredient = obj['recipeIngredient']

  return {
    name,
    image: obj['image'],
    recipeIngredient: isStringArray(recipeIngredient) ? recipeIngredient : undefined,
    publisher: obj['publisher'],
    cookTime: obj['cookTime'],
    totalTime: obj['totalTime'],
  }
}

/**
 * オブジェクトからurl プロパティを抽出
 */
function extractUrlFromObject(obj: unknown): string {
  if (obj && typeof obj === 'object' && 'url' in obj) {
    const url = (obj as Record<string, unknown>)['url']
    if (typeof url === 'string') return url
  }
  return ''
}

/**
 * 配列から画像URLを抽出
 */
function extractImageFromArray(arr: unknown[]): string {
  const first = arr[0]
  if (typeof first === 'string') return first
  return extractUrlFromObject(first)
}

/**
 * 画像URLを抽出（様々な形式に対応）
 */
function extractImageUrl(image: unknown): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return extractImageFromArray(image)
  return extractUrlFromObject(image)
}

/**
 * ドメイン名を抽出してサイト名として使用
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
 * publisherフィールドからソース名（サイト名）を抽出
 */
function extractSourceName(publisher: unknown, url: string): string {
  if (!publisher) return extractDomainName(url)
  if (typeof publisher === 'string') return publisher
  if (publisher && typeof publisher === 'object' && 'name' in publisher) {
    const name = (publisher as Record<string, unknown>)['name']
    if (typeof name === 'string') return name
  }
  return extractDomainName(url)
}

/**
 * 食材名を正規化（分量を除去）
 * 例: "100g 鶏もも肉" → "鶏もも肉"
 *     "大さじ1 醤油" → "醤油"
 */
function normalizeIngredients(raw: string[]): string[] {
  return raw
    .map((item) => {
      // 先頭の数量・単位を除去
      const cleaned = item
        // 数字 + 単位のパターン
        .replace(
          /^[\d\/\.〜～約]+\s*(g|kg|ml|cc|L|個|本|枚|切れ|尾|匹|合|カップ|cm|mm)?\s*/i,
          ''
        )
        // 大さじ・小さじなどのパターン
        .replace(/^(大さじ|小さじ|適量|少々|お好みで?|ひとつまみ|適宜)[\d\/\.]*\s*/i, '')
        // 残った先頭の空白や記号を除去
        .replace(/^[\s・]+/, '')
        .trim()
      return cleaned
    })
    .filter((item) => item.length > 0)
}

/**
 * HTMLからJSON-LD (schema.org/Recipe) を抽出
 * @returns 抽出結果、または見つからない場合はnull
 */
export function extractRecipeFromJsonLd(
  html: string,
  sourceUrl: string
): JsonLdExtraction | null {
  const blocks = extractJsonLdBlocks(html)

  for (const block of blocks) {
    const recipe = findRecipeSchema(block)
    if (recipe && recipe.recipeIngredient?.length) {
      const cookingTimeMinutes =
        parseIso8601Duration(recipe.cookTime) ?? parseIso8601Duration(recipe.totalTime)
      return {
        title: recipe.name,
        sourceName: extractSourceName(recipe.publisher, sourceUrl),
        imageUrl: extractImageUrl(recipe.image),
        ingredients: normalizeIngredients(recipe.recipeIngredient),
        cookingTimeMinutes: cookingTimeMinutes ?? null,
      }
    }
  }

  return null
}
