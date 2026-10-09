import type { messagingApi } from '@line/bot-sdk'
import type { RecipeNoteResult } from '@/lib/db/queries/recipe-notes'
import { RECIPE_INPUT_PREFIX } from '@/lib/recipe/note-markdown/prefix'
import type { ParseWarning } from '@/lib/recipe/note-markdown/types'
import type { RecipeNoteFields } from '@/types/recipe'
import { createSingleRecipeMessage } from './flex-message'
import { toRecipeCardUrl } from './track-redirect'

type Message = messagingApi.Message

/** ノート経由のレシピの `source_name`。`create_recipe_note` RPC が書き込む値と同じ */
const NOTE_SOURCE_NAME = 'マイレシピ'

/**
 * 返信に載せる警告の上限。崩れた入力だと警告が何十件も出ることがあり、
 * テキストの上限（5000文字）より先に読めなくなるので、残りは件数だけ伝える
 */
export const MAX_WARNINGS_IN_REPLY = 5

function toBullets(lines: string[]): string {
  return lines.map((line) => `・${line}`).join('\n')
}

function formatWarnings(warnings: ParseWarning[]): string {
  const shown = warnings.slice(0, MAX_WARNINGS_IN_REPLY).map((w) => w.message)
  const rest = warnings.length - shown.length
  const more = rest > 0 ? `\n…ほか${rest}件` : ''
  return `⚠️ 読み取れなかったところがあります。ノートを開いて確認してください。\n${toBullets(shown)}${more}`
}

/**
 * 登録できたときの返信。テキスト（タイトルと警告）と、ノートを開くカード
 *
 * カードの URL は `toRecipeCardUrl` で LIFF URL を直接載せる（302 を挟むと閉じた後に空白ページが残る。#203）
 */
export function buildRegisteredMessages(
  fields: RecipeNoteFields,
  warnings: ParseWarning[],
  saved: RecipeNoteResult
): Message[] {
  const header = `✅ レシピノートを登録しました！\n\n📖 ${fields.title}`
  const text = warnings.length > 0 ? `${header}\n\n${formatWarnings(warnings)}` : header
  const card = createSingleRecipeMessage({
    title: fields.title,
    url: toRecipeCardUrl({ id: saved.recipeId, url: `/notes/${saved.noteId}` }),
    imageUrl: null,
    sourceName: NOTE_SOURCE_NAME,
    cookingTimeMinutes: fields.cookingTimeMinutes,
    ingredientCount: fields.ingredients.length,
  })
  return [{ type: 'text', text }, card]
}

/** 登録の最低条件を満たさないときの返信。理由はパーサの `blockingReasons` をそのまま使う */
export function buildNotRegistrableText(blockingReasons: string[]): string {
  return [
    '⚠️ レシピを登録できませんでした',
    toBullets(blockingReasons),
    `直したうえで、1行目の ${RECIPE_INPUT_PREFIX} を残したまま送り直してください。`,
  ].join('\n\n')
}

/** 接頭語が無いレシピらしい文への案内。検索には流さない */
export function buildPrefixHintText(): string {
  return [
    '📝 レシピを登録したいときは、1行目に次の文字を付けて送ってください。',
    RECIPE_INPUT_PREFIX,
    '材料や食材で検索したいときは、食材名だけを送ってください。',
  ].join('\n\n')
}
