import type { messagingApi } from '@line/bot-sdk'
import { COLORS } from './flex-colors'
import { createHeroImage } from './flex-image'

export interface RecipeCardData {
  /** あれば縦リストの行に [材料] ボタン（postback）を出す（#213） */
  recipeId?: string
  title: string
  url: string
  imageUrl?: string | null
  sourceName?: string | null
  ingredientCount?: number | null
  cookingTimeMinutes?: number | null
}

type FlexMessage = messagingApi.FlexMessage
/**
 * altText の上限。超えると reply 全体が 400 で落ちる。
 * レシピタイトルは、`#` 見出しの無いノートでは本文の最初の行がそのまま入るので長くなりうる（#208）。
 * 公式の上限より緩くならないよう、保守的に 400 文字で丸める
 */
const ALT_TEXT_MAX = 400

function toAltText(text: string): string {
  return text.length > ALT_TEXT_MAX ? `${text.slice(0, ALT_TEXT_MAX - 1)}…` : text
}

function createBodyContents(
  title: string,
  sourceName?: string | null,
  cookingTimeMinutes?: number | null,
  ingredientCount?: number | null,
): messagingApi.FlexComponent[] {
  const contents: messagingApi.FlexComponent[] = [
    { type: 'text', text: title, weight: 'bold', size: 'md', wrap: true, maxLines: 2 },
  ]
  if (sourceName) {
    contents.push({ type: 'text', text: sourceName, size: 'xs', color: COLORS.textMuted, margin: 'sm' })
  }
  const timeText = cookingTimeMinutes != null ? `${cookingTimeMinutes}分` : '-'
  const countText = ingredientCount != null ? `${ingredientCount}品` : '-'
  contents.push({ type: 'text', text: `⏱ ${timeText}　🍴 ${countText}`, size: 'xs', color: COLORS.primary, margin: 'sm' })
  return contents
}

function createFooterButton(url: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    contents: [{ type: 'button', action: { type: 'uri', label: 'レシピを見る', uri: url }, style: 'primary', color: COLORS.primary }],
  }
}

/** 単一のレシピカード（Bubble）を生成 */
function createRecipeBubble(recipe: RecipeCardData): messagingApi.FlexBubble {
  return {
    type: 'bubble',
    size: 'kilo',
    hero: createHeroImage(recipe.imageUrl),
    body: { type: 'box', layout: 'vertical', contents: createBodyContents(recipe.title, recipe.sourceName, recipe.cookingTimeMinutes, recipe.ingredientCount) },
    footer: createFooterButton(recipe.url),
  }
}

/** 単一レシピのFlex Message */
export function createSingleRecipeMessage(recipe: RecipeCardData): FlexMessage {
  return {
    type: 'flex',
    altText: toAltText(`レシピ: ${recipe.title}`),
    contents: createRecipeBubble(recipe),
  }
}

/** 複数レシピのCarousel Flex Message（最大10件） */
export function createRecipeCarouselMessage(recipes: RecipeCardData[]): FlexMessage {
  const bubbles = recipes.slice(0, 10).map(createRecipeBubble)

  return {
    type: 'flex',
    altText: `${recipes.length}件のレシピ`,
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
  }
}

/** 「もっと見る」Bubble を生成 */
function createMoreBubble(url: string, totalCount: number): messagingApi.FlexBubble {
  return {
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      justifyContent: 'center',
      contents: [
        { type: 'text', text: `他 ${totalCount - 3}件`, size: 'lg', weight: 'bold', align: 'center', color: COLORS.textDark },
        { type: 'text', text: 'すべてのレシピを見る', size: 'sm', align: 'center', color: COLORS.textMuted, margin: 'md' },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [{ type: 'button', action: { type: 'uri', label: 'もっと見る', uri: url }, style: 'primary', color: COLORS.primary }],
    },
  }
}

/** 検索結果用のCarousel（もっと見るボタン付き） */
export function createSearchResultMessage(recipes: RecipeCardData[], moreUrl: string, totalCount: number): FlexMessage {
  const bubbles: messagingApi.FlexBubble[] = recipes.slice(0, 3).map(createRecipeBubble)
  bubbles.push(createMoreBubble(moreUrl, totalCount))

  return {
    type: 'flex',
    altText: `${totalCount}件のレシピが見つかりました`,
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
  }
}

/** レシピ数に応じてメッセージを生成 */
export function createRecipeMessage(recipes: RecipeCardData[]): FlexMessage {
  if (recipes.length === 1) {
    return createSingleRecipeMessage(recipes[0])
  }
  return createRecipeCarouselMessage(recipes)
}
