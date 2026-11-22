// gh / git の出力を読む純粋な関数（テスト対象）
import type { Checkbox, Leftover } from '../types'

/** `feature/add-xxx-267` → 267。/work-issue の命名規則（末尾が Issue 番号）に従う */
export const issueOfBranch = (branch: string): number | null => {
  const found = /^feature\/.+-(\d+)$/.exec(branch)
  return found ? Number(found[1]) : null
}

export const checkboxesOf = (body: string): Checkbox[] =>
  [...body.matchAll(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/gm)].map(m => ({
    isDone: m[1] !== ' ',
    text: (m[2] ?? '').trim(),
  }))

/** 最後のコメントの 1 行目の目印。無ければ null（人が返信済み） */
export const markerOf = (lastComment: string): string | null =>
  /^<!--\s*work-issue:([a-z]+)/.exec(lastComment.trimStart())?.[1] ?? null

/** Status と目印から「次は誰の番か」。/work-issue の Status 表に対応する */
export const turnOf = (status: string | null, marker: string | null): string => {
  switch (status) {
    case 'Todo':
      return '未整理'
    case 'Plan':
      return '方針の相談待ち'
    case 'Needs input':
      return marker === null ? 'AI の番（/work-issue で再開）' : 'あなたの番'
    case 'Ready':
      return '着手待ち（In Progress に移すと実装）'
    case 'In Progress':
      return '実装中'
    case 'In review':
      return 'あなたのレビュー待ち'
    case 'Done':
      return '完了'
    default:
      return 'Status 不明'
  }
}

/** `git worktree list --porcelain` から `.claude/worktrees/` 配下のものだけ */
export const worktreesOf = (porcelain: string): Omit<Leftover, 'issue'>[] =>
  porcelain
    .split('\n\n')
    .map(block => ({
      path: /^worktree (.+)$/m.exec(block)?.[1] ?? '',
      branch: /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? '',
    }))
    .filter(w => w.path.includes('/.claude/worktrees/') && w.branch !== '')

/** マージ済み PR のブランチか、close 済み Issue の番号を持つ worktree */
export const leftoversOf = (
  worktrees: Omit<Leftover, 'issue'>[],
  mergedBranches: string[],
  closedIssues: number[],
): Leftover[] =>
  worktrees
    .map(w => ({ ...w, issue: issueOfBranch(w.branch) }))
    .filter(
      w =>
        mergedBranches.includes(w.branch) ||
        (w.issue !== null && closedIssues.includes(w.issue)),
    )

/** project-status.sh list の「番号<TAB>Status<TAB>タイトル」を数える */
export const waitingOf = (tsv: string) => {
  const statuses = tsv.split('\n').map(line => line.split('\t')[1])
  return {
    inProgress: statuses.filter(s => s === 'In Progress').length,
    needsInput: statuses.filter(s => s === 'Needs input').length,
  }
}
