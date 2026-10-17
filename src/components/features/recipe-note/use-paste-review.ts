'use client'

import { useCallback, useEffect, useState } from 'react'
import { readPastedMarkdown } from '@/lib/recipe/note-markdown/read-pasted-markdown'
import type { ParseWarning } from '@/lib/recipe/note-markdown/types'
import type { RecipeNoteDetail } from '@/types/recipe'

export interface PasteReviewDraft { note: RecipeNoteDetail; warnings: ParseWarning[] }

/** 確認画面の履歴に付ける印。Next.js は pushState に渡した state に自前のキーを足すだけで、これは残す */
const REVIEW_STATE_KEY = 'recipeNoteImportReview'

function isReviewEntry(state: unknown): boolean {
  return typeof state === 'object' && state !== null && REVIEW_STATE_KEY in state
}

/**
 * 貼り付け → 確認の2段階の状態（#178）。
 *
 * 確認はページ内の状態の切り替えなので、そのままだと端末の「戻る」でページごと離れ、貼った文が消える。
 * 確認に入るときに印を付けた履歴を1つ積み、戻る・進む（popstate）では印を見て画面を決める。貼った文 `text` は残す。
 * フォームのキャンセルも `history.back()` にして、履歴と画面をずらさない。
 * 確認の履歴の上で読み直したとき（戻る → 進む → 読み取る、リロード後など）は積まずに置き換える。積むと
 * キャンセル後の「戻る」でページを離れられなくなる。
 */
export function usePasteReview() {
  const [text, setText] = useState('')
  const [blockingReasons, setBlockingReasons] = useState<string[]>([])
  const [draft, setDraft] = useState<PasteReviewDraft | null>(null)
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    const sync = (e: PopStateEvent) => setReviewing(isReviewEntry(e.state))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const read = useCallback(() => {
    const result = readPastedMarkdown(text)
    if (result.kind === 'blocked') return setBlockingReasons(result.reasons)
    setBlockingReasons([])
    setDraft({ note: result.note, warnings: result.warnings })
    setReviewing(true)
    // URL は変えない。Next.js は history.pushState / replaceState を自前のルーターと同期させている
    const entry = { [REVIEW_STATE_KEY]: true }
    if (isReviewEntry(window.history.state)) window.history.replaceState(entry, '')
    else window.history.pushState(entry, '')
    window.scrollTo(0, 0)
  }, [text])

  const changeText = useCallback((value: string) => {
    setText(value)
    setBlockingReasons([])
  }, [])

  const cancelReview = useCallback(() => window.history.back(), [])

  return { text, changeText, blockingReasons, draft: reviewing ? draft : null, read, cancelReview }
}
