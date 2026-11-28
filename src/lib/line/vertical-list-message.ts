import type { messagingApi } from '@line/bot-sdk'
import { COLORS } from './flex-colors'
import { createThumbnail } from './flex-image'
import type { RecipeCardData } from './flex-message'
import { buildIngredientsPostbackData, toIngredientsDisplayText } from './ingredients-postback'

/**
 * アクションの label の上限（LINE 仕様）
 *
 * 超えると reply 全体が 400 で落ちる（`label must not be longer than 40 characters`）。
 * ボックスの action ラベルは画面に出ずアクセシビリティ用途なので、切り詰めて構わない。
 */
const ACTION_LABEL_MAX = 40

/** レシピタイトルをアクションの label に使える長さへ丸める */
function toActionLabel(title: string): string {
  return title.length > ACTION_LABEL_MAX ? title.slice(0, ACTION_LABEL_MAX) : title
}

/**
 * 縦リストの行の右端に置く [材料] ボタン（#213）。
 * 行全体の uri アクションより内側のアクションが優先される。label は固定文言（40 文字上限 #170 を踏まない）
 */
function createIngredientsButton(recipeId: string, title: string): messagingApi.FlexBox {
  return {
    type: 'box', layout: 'vertical', flex: 0, justifyContent: 'center', paddingStart: 'sm',
    action: { type: 'postback', label: '材料', data: buildIngredientsPostbackData(recipeId), displayText: toIngredientsDisplayText(title) },
    contents: [{
      type: 'box', layout: 'vertical', cornerRadius: 'xxl', borderWidth: 'normal', borderColor: COLORS.primary,
      paddingTop: 'sm', paddingBottom: 'sm', paddingStart: 'md', paddingEnd: 'md',
      contents: [{ type: 'text', text: '材料', size: 'xs', color: COLORS.primary, align: 'center' }],
    }],
  }
}

function createListItemBox(recipe: RecipeCardData): messagingApi.FlexBox {
  const textContents: messagingApi.FlexComponent[] = [
    { type: 'text', text: recipe.title, weight: 'bold', size: 'sm', wrap: true, maxLines: 2 },
  ]
  if (recipe.sourceName) {
    textContents.push({ type: 'text', text: recipe.sourceName, size: 'xs', color: COLORS.textMuted, margin: 'sm' })
  }
  const timeText = recipe.cookingTimeMinutes != null ? `${recipe.cookingTimeMinutes}分` : '-'
  const countText = recipe.ingredientCount != null ? `${recipe.ingredientCount}品` : '-'
  textContents.push({
    type: 'box', layout: 'horizontal', margin: 'sm',
    contents: [
      { type: 'text', text: `⏱ ${timeText}`, size: 'xs', color: COLORS.primary, flex: 0 },
      { type: 'text', text: `🍴 ${countText}`, size: 'xs', color: COLORS.primary, flex: 0, margin: 'md' },
    ],
  })
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    paddingTop: 'lg',
    paddingBottom: 'lg',
    paddingStart: 'md',
    paddingEnd: 'md',
    action: { type: 'uri', label: toActionLabel(recipe.title), uri: recipe.url },
    contents: [
      ...createThumbnail(recipe.imageUrl, recipe.title),
      { type: 'box', layout: 'vertical', justifyContent: 'center', contents: textContents },
      ...(recipe.recipeId ? [createIngredientsButton(recipe.recipeId, recipe.title)] : []),
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
): messagingApi.FlexMessage {
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
