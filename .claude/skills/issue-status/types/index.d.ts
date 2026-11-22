export type Checkbox = { isDone: boolean; text: string }

export type PullRequest = { number: number; isDraft: boolean; state: string }

/** 今いる worktree のブランチ名から特定した、対応中の Issue */
export type Focus = {
  number: number
  title: string
  isClosed: boolean
  /** Projects の Status（取れなければ null） */
  status: string | null
  /** 最後のコメントの `<!-- work-issue:xxx -->` の xxx（目印が無ければ null ＝ 人の返信） */
  marker: string | null
  checkboxes: Checkbox[]
  pr: PullRequest | null
}

/** PR がマージ済み、または Issue が close 済みなのに残っている worktree */
export type Leftover = { branch: string; path: string; issue: number | null }

export type Snapshot = {
  branch: string
  focus: Focus | null
  /** focus が無いとき（develop 上など）の作業待ちの件数 */
  waiting: { inProgress: number; needsInput: number } | null
  leftovers: Leftover[]
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'issue-status': { snapshot: Shaped<Snapshot | null> }
  }
}
