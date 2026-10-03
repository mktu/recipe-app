import type { RecipeNoteFields } from '@/types/recipe'

/**
 * パース時の警告。`message` はそのまま LINE の返信や画面に出せる短い文。
 * `line` は原因になった元の行（あれば）
 */
export interface ParseWarning {
  message: string
  line?: string
}

export interface ParseRecipeMarkdownResult {
  /** 読めた分。`imageKey` は Markdown に無いので常に null */
  fields: RecipeNoteFields
  warnings: ParseWarning[]
  /**
   * 登録してよいか。呼び出し元（LINE #208 / Web #178）は条件を書き直さず、これをそのまま使う。
   * false のときの理由は `blockingReasons`
   */
  registrable: boolean
  blockingReasons: string[]
}
