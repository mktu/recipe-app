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
  author?: unknown
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
 * JSON-LDデータからRecipeスキーマを検索・パース
 * 直接Recipe、@graph配列、ルート配列に対応
 */
function findRecipeSchema(data: unknown): ParsedRecipeJsonLd | null {
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>

  // 直接Recipeの場合
  if (isRecipeType(obj['@type'])) {
    return parseRecipeObject(obj)
  }

  // @graph配列内を検索
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      if (item && typeof item === 'object') {
        const itemObj = item as Record<string, unknown>
        if (isRecipeType(itemObj['@type'])) {
          return parseRecipeObject(itemObj)
        }
      }
    }
  }

  // ルートが配列の場合
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findRecipeSchema(item)
      if (result) return result
    }
  }

  return null
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
    author: obj['author'],
  }
}

/**
 * 画像URLを抽出（様々な形式に対応）
 */
function extractImageUrl(image: unknown): string {
  if (!image) return ''
  if (typeof image === 'string') return image
  if (Array.isArray(image)) {
    const first = image[0]
    if (typeof first === 'string') return first
    if (first && typeof first === 'object' && 'url' in first) {
      const url = (first as Record<string, unknown>)['url']
      if (typeof url === 'string') return url
    }
  }
  if (typeof image === 'object' && 'url' in image) {
    const url = (image as Record<string, unknown>)['url']
    if (typeof url === 'string') return url
  }
  return ''
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
 * authorフィールドからソース名を抽出
 */
function extractSourceName(author: unknown, url: string): string {
  if (!author) return extractDomainName(url)
  if (typeof author === 'string') return author
  if (author && typeof author === 'object' && 'name' in author) {
    const name = (author as Record<string, unknown>)['name']
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
      return {
        title: recipe.name,
        sourceName: extractSourceName(recipe.author, sourceUrl),
        imageUrl: extractImageUrl(recipe.image),
        ingredients: normalizeIngredients(recipe.recipeIngredient),
      }
    }
  }

  return null
}
