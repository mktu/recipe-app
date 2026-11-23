/** 確認画面から URL 入力画面へ戻すときのエラー種別（クエリ `error`） */
export const UNFETCHABLE_ERROR = 'unfetchable'

const MESSAGES: Record<string, string> = {
  [UNFETCHABLE_ERROR]: 'レシピを取得できませんでした。URL を確認してください',
}

export function urlInputErrorMessage(code: string | undefined): string | null {
  return (code && MESSAGES[code]) || null
}
