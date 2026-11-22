import type { messagingApi } from '@line/bot-sdk'
import type { IngredientRaw } from '@/types/recipe'
import { COLORS } from './flex-colors'

export interface RecipeIngredientsForBot {
  title: string
  /** カードと同じ URL（閲覧記録を通す。`toRecipeCardUrl`） */
  url: string
  ingredients: IngredientRaw[]
}

/** テキストメッセージの上限（LINE 仕様）。超えると reply 全体が 400 で落ちる */
const TEXT_MAX = 5000

export const NO_INGREDIENTS_TEXT = '材料情報がありません。'
export const RECIPE_NOT_FOUND_TEXT = 'レシピが見つかりませんでした。削除された可能性があります。'

/**
 * 1 行 1 材料。外部サイト由来は amount が常に空なので食材名だけになる
 * （`docs/SCRAPING_POLICY.md`。name に分量が残っていることはある）
 */
function toLine(ing: IngredientRaw): string {
  const amount = ing.amount?.trim()
  return amount ? `・${ing.name} ${amount}` : `・${ing.name}`
}

/**
 * 材料をテキストで組み立てる。
 * Flex にしないのは、長押しでコピーして買い物メモに貼れるようにするため
 */
export function buildIngredientsText(recipe: RecipeIngredientsForBot): string {
  const lines = recipe.ingredients.filter((ing) => ing.name?.trim()).map(toLine)
  const body = lines.length > 0 ? lines.join('\n') : NO_INGREDIENTS_TEXT
  const text = `🥕 ${recipe.title} の材料\n${body}`
  return text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX - 1)}…` : text
}

/** 作り方はサイト（ノート）で見てもらうので、レシピを開くボタンを添える */
function buildOpenRecipeMessage(url: string): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: 'レシピを見る',
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [{ type: 'button', action: { type: 'uri', label: 'レシピを見る', uri: url }, style: 'primary', color: COLORS.primary, height: 'sm' }],
      },
    },
  }
}

export function buildIngredientsMessages(recipe: RecipeIngredientsForBot): messagingApi.Message[] {
  return [
    { type: 'text', text: buildIngredientsText(recipe) },
    buildOpenRecipeMessage(recipe.url),
  ]
}
