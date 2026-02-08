import type { messagingApi } from '@line/bot-sdk'
import { fetchFrequentIngredientsByLineUserId } from '@/lib/db/queries/frequent-ingredients'
import { getDefaultIngredients } from './default-ingredients'

type QuickReplyItem = messagingApi.QuickReplyItem

/** クイックリプライに表示する食材の最大数（「もっと見る」ボタン用に1枠確保） */
const MAX_INGREDIENT_ITEMS = 12

/**
 * 食材検索用のクイックリプライを構築
 * @param lineUserId LINE ユーザーID
 * @returns QuickReplyItem の配列
 */
export async function buildIngredientQuickReply(lineUserId: string): Promise<QuickReplyItem[]> {
  const items: QuickReplyItem[] = []

  // ユーザーの頻出食材を取得
  let ingredients: { id: string; name: string }[] = []

  try {
    const frequent = await fetchFrequentIngredientsByLineUserId(lineUserId, MAX_INGREDIENT_ITEMS)
    ingredients = frequent.map((f) => ({ id: f.id, name: f.name }))
  } catch (err) {
    console.error('[buildIngredientQuickReply] Error fetching frequent ingredients:', err)
  }

  // 頻出食材が足りない場合はデフォルトで補完
  if (ingredients.length < MAX_INGREDIENT_ITEMS) {
    try {
      const defaults = await getDefaultIngredients()
      const existingIds = new Set(ingredients.map((i) => i.id))
      const additional = defaults
        .filter((d) => !existingIds.has(d.id))
        .slice(0, MAX_INGREDIENT_ITEMS - ingredients.length)
      ingredients = [...ingredients, ...additional]
    } catch (err) {
      console.error('[buildIngredientQuickReply] Error fetching default ingredients:', err)
    }
  }

  // 食材ボタンを追加
  for (const ing of ingredients.slice(0, MAX_INGREDIENT_ITEMS)) {
    items.push({
      type: 'action',
      action: {
        type: 'message',
        label: ing.name,
        text: ing.name,
      },
    })
  }

  // 「もっと食材を見る」ボタンを追加（LIFF遷移）
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || ''
  if (liffId) {
    items.push({
      type: 'action',
      action: {
        type: 'uri',
        label: 'もっと食材を見る',
        uri: `https://liff.line.me/${liffId}`,
      },
    })
  }

  return items
}
