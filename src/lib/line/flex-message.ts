import type { messagingApi } from '@line/bot-sdk'

export interface RecipeCardData {
  title: string
  url: string
  imageUrl?: string | null
  sourceName?: string | null
  ingredientCount?: number | null
  cookingTimeMinutes?: number | null
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

function createListItemBox(recipe: RecipeCardData): messagingApi.FlexBox {
  const textContents: messagingApi.FlexComponent[] = [
    { type: 'text', text: recipe.title, weight: 'bold', size: 'sm', wrap: true, maxLines: 2 },
  ]
  if (recipe.sourceName) {
    textContents.push({ type: 'text', text: recipe.sourceName, size: 'xs', color: COLORS.textMuted, margin: 'sm' })
  }
  if (recipe.ingredientCount != null) {
    textContents.push({ type: 'text', text: `材料 ${recipe.ingredientCount}品`, size: 'xs', color: COLORS.primary, margin: 'sm' })
  }
  if (recipe.cookingTimeMinutes != null) {
    textContents.push({ type: 'text', text: `⏱ ${recipe.cookingTimeMinutes}分`, size: 'xs', color: COLORS.primary, margin: 'sm' })
  }
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    paddingTop: 'lg',
    paddingBottom: 'lg',
    paddingStart: 'md',
    paddingEnd: 'md',
    action: { type: 'uri', label: recipe.title, uri: recipe.url },
    contents: [
      { type: 'image', url: recipe.imageUrl || DEFAULT_IMAGE, size: 'sm', aspectRatio: '1:1', aspectMode: 'cover', flex: 0 },
      { type: 'box', layout: 'vertical', justifyContent: 'center', contents: textContents },
    ],
  }
}

function buildListItems(recipes: RecipeCardData[]): messagingApi.FlexComponent[] {
  const items: messagingApi.FlexComponent[] = []
  recipes.forEach((recipe, index) => {
    if (index > 0) items.push({ type: 'separator' })
    items.push(createListItemBox(recipe))
  })
  return items
}

/** 縦リスト型 Flex Message（1バブルに複数レシピを縦並び） */
export function createVerticalListMessage(
  recipes: RecipeCardData[],
  listUrl: string,
  totalCount: number,
  headerText?: string,
  showFooter?: boolean
): FlexMessage {
  const header = headerText ?? `🔍 ${totalCount}件見つかりました`
  const altText = headerText ?? `${totalCount}件のレシピが見つかりました`
  const hasMore = showFooter !== undefined ? showFooter : recipes.length < totalCount
  return {
    type: 'flex',
    altText,
    contents: {
      type: 'bubble',
      size: 'giga',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: header, weight: 'bold', size: 'md' }],
      },
      body: { type: 'box', layout: 'vertical', spacing: 'none', paddingAll: 'none', contents: buildListItems(recipes) },
      ...(hasMore && {
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: 'lg',
          contents: [
            { type: 'text', text: 'さらに見る →', size: 'sm', color: COLORS.primary, align: 'end', action: { type: 'uri', label: 'さらに見る', uri: listUrl } },
          ],
        },
      }),
    },
  }
}
