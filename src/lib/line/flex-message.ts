import type { messagingApi } from '@line/bot-sdk'

export interface RecipeCardData {
  title: string
  url: string
  imageUrl?: string | null
  sourceName?: string | null
}

type FlexMessage = messagingApi.FlexMessage

// RecipeHub Design Tokens
const COLORS = {
  primary: '#f59e0b',      // Amber/Gold - ボタン
  textDark: '#3d3d3d',     // 濃いテキスト
  textMuted: '#888888',    // 薄いテキスト（ソース名など）
}

const DEFAULT_IMAGE = 'https://via.placeholder.com/300x200?text=No+Image'

function createHeroImage(imageUrl: string | null | undefined): messagingApi.FlexImage {
  return { type: 'image', url: imageUrl || DEFAULT_IMAGE, size: 'full', aspectRatio: '20:13', aspectMode: 'cover' }
}

function createBodyContents(title: string, sourceName?: string | null): messagingApi.FlexComponent[] {
  const contents: messagingApi.FlexComponent[] = [
    { type: 'text', text: title, weight: 'bold', size: 'md', wrap: true, maxLines: 2 },
  ]
  if (sourceName) {
    contents.push({ type: 'text', text: sourceName, size: 'xs', color: COLORS.textMuted, margin: 'sm' })
  }
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
    body: { type: 'box', layout: 'vertical', contents: createBodyContents(recipe.title, recipe.sourceName) },
    footer: createFooterButton(recipe.url),
  }
}

/** 単一レシピのFlex Message */
export function createSingleRecipeMessage(recipe: RecipeCardData): FlexMessage {
  return {
    type: 'flex',
    altText: `レシピ: ${recipe.title}`,
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

/** レシピ数に応じてメッセージを生成 */
export function createRecipeMessage(recipes: RecipeCardData[]): FlexMessage {
  if (recipes.length === 1) {
    return createSingleRecipeMessage(recipes[0])
  }
  return createRecipeCarouselMessage(recipes)
}
