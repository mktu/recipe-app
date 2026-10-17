import { parseRecipeMarkdown } from './parse-recipe-markdown'
import type { ParseWarning } from './types'
import type { RecipeNoteDetail } from '@/types/recipe'

/** 貼り付けた Markdown の読み取り結果。編集へ進めるか、止めて理由を見せるか */
export type PasteDraft =
  | { kind: 'ready'; note: RecipeNoteDetail; warnings: ParseWarning[] }
  | { kind: 'blocked'; reasons: string[] }

/**
 * 貼り付けた Markdown を読み、編集フォームの初期値にする（#178）。
 *
 * 登録の可否はパーサの `registrable` をそのまま使い、ここで条件を書き直さない
 * （docs/NOTE_MARKDOWN_FORMAT.md）。登録できないものは編集へ進ませず、理由を返す。
 * 足りない分は貼り直すか、手で書く画面で書いてもらう。
 */
export function readPastedMarkdown(text: string): PasteDraft {
  const result = parseRecipeMarkdown(text)
  if (!result.registrable) return { kind: 'blocked', reasons: result.blockingReasons }
  return {
    kind: 'ready',
    note: { ...result.fields, id: '', recipeId: null, imageUrl: null },
    warnings: result.warnings,
  }
}
