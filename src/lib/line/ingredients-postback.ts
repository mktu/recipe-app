/**
 * 縦リストの [材料] ボタンが送る postback の data（#213）
 *
 * data は 300 文字上限だが UUID なら十分に収まる。
 * **data はクライアントから届くので改ざんされうる。** ここで取り出した recipeId は、
 * 取得時に必ず user_id と組み合わせて絞ること（`fetchRecipeIngredientsForBot`）。
 */
const ACTION_KEY = 'action'
const RECIPE_ID_KEY = 'recipeId'
const INGREDIENTS_ACTION = 'ingredients'

export function buildIngredientsPostbackData(recipeId: string): string {
  return new URLSearchParams({ [ACTION_KEY]: INGREDIENTS_ACTION, [RECIPE_ID_KEY]: recipeId }).toString()
}

/** 材料の postback なら recipeId を返す。それ以外は null */
export function parseIngredientsPostback(data: string): string | null {
  const params = new URLSearchParams(data)
  if (params.get(ACTION_KEY) !== INGREDIENTS_ACTION) return null
  return params.get(RECIPE_ID_KEY) || null
}

/** postback の displayText の上限（LINE 仕様）。超えると reply 全体が 400 で落ちる */
const DISPLAY_TEXT_MAX = 300
const DISPLAY_TEXT_SUFFIX = 'の材料'

/**
 * タップ時にユーザー発言としてトークに出す文言。
 * ノートのタイトルは本文の最初の行になりうるので長さを丸める（#208）
 */
export function toIngredientsDisplayText(title: string): string {
  const max = DISPLAY_TEXT_MAX - DISPLAY_TEXT_SUFFIX.length
  const head = title.length > max ? `${title.slice(0, max - 1)}…` : title
  return `${head}${DISPLAY_TEXT_SUFFIX}`
}
