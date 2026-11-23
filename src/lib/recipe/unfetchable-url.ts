/** 取得できない URL を断るときの文言（LINE・Web・再取得で共通。#242） */
export const UNFETCHABLE_MESSAGE = 'レシピを取得できませんでした。URL を確認してください。'

/** 確認画面から URL 入力画面へ戻すときのエラー種別（クエリ `error`） */
export const UNFETCHABLE_ERROR = 'unfetchable'

/** URL 入力画面のクエリ `error` を表示用の文言にする */
export function urlInputErrorMessage(code: string | undefined): string | null {
  return code === UNFETCHABLE_ERROR ? UNFETCHABLE_MESSAGE : null
}
