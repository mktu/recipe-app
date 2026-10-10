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
 * - **接頭語付きの判定は URL より前。** AI は参考 URL を本文に含めることがあり、
 *   後に回すと URL 登録に流れてしまう
 * - **接頭語の無いレシピらしい文の判定は URL より後。** `looksLikeRecipeMarkdown` は `【材料】` `**作り方**`
 *   のような見出しも拾うので、レシピサイトの共有文（本文＋URL）まで案内に回り、従来の URL 登録が黙って変わる。
 *   AI の出力はプロンプト（#214）経由でほぼ接頭語が付くので、こちらを優先しても失うものは小さい
 */
export function resolveMessageRoute(text: string): MessageRoute {
  if (hasRecipeInputPrefix(text)) return 'note'
  if (extractUrls(text).length > 0) return 'url'
  if (looksLikeRecipeMarkdown(text)) return 'note-hint'
  return 'search'
}
