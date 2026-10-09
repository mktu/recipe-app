import { hasRecipeInputPrefix } from '@/lib/recipe/note-markdown/prefix'
import { looksLikeRecipeMarkdown } from '@/lib/recipe/note-markdown/parse-recipe-markdown'

/**
 * キーワードに当たらなかったテキストメッセージの行き先
 *
 * - `note`: 接頭語付きのレシピ Markdown。ノートとして登録する（#208）
 * - `note-hint`: 接頭語は無いが、材料と手順の見出しがそろったレシピらしい文。登録も検索もせず、接頭語を付けるよう案内する
 * - `url`: URL を含む。URL からレシピを登録する
 * - `search`: それ以外。食材・キーワード検索
 */
export type MessageRoute = 'note' | 'note-hint' | 'url' | 'search'

/** テキストから URL を抽出する */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g
  return text.match(urlRegex) || []
}

/**
 * 行き先を決める。キーワード判定（完全一致）の後に呼ぶ
 *
 * **レシピ Markdown の判定は URL より前。** AI は参考 URL を本文に含めることがあり、
 * 後に回すと URL 登録に流れてしまう。接頭語の無いレシピらしい文も同じ理由で URL より前に見る。
 */
export function resolveMessageRoute(text: string): MessageRoute {
  if (hasRecipeInputPrefix(text)) return 'note'
  if (looksLikeRecipeMarkdown(text)) return 'note-hint'
  if (extractUrls(text).length > 0) return 'url'
  return 'search'
}
