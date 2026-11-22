// git / gh / project-status.sh を叩いて Snapshot を作る
import type { EngineInterface } from 'claude-code'

import type { Focus, PullRequest, Snapshot } from '../types'
import {
  checkboxesOf,
  issueOfBranch,
  leftoversOf,
  markerOf,
  waitingOf,
  worktreesOf,
} from './parse'

const STATUS_SCRIPT = '.claude/skills/work-issue/scripts/project-status.sh'

type Run = (argv: string[]) => Promise<string | null>

/** 失敗（非ゼロ終了・起動できない・タイムアウト）は null にして、表示を欠けさせるだけにする */
async function runIn($: EngineInterface, cwd: string, argv: string[]): Promise<string | null> {
  try {
    const r = await $.process.run(argv, { cwd, timeoutMs: 20_000 })
    return r.exitCode === 0 ? r.stdout.trim() : null
  } catch {
    return null
  }
}

const json = <T>(text: string | null): T | null => {
  if (text === null || text === '') return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

type IssueJson = { title: string; state: string; body: string; last: string }

const focusOf = async (run: Run, top: string, n: number, branch: string): Promise<Focus | null> => {
  const [issueText, status, prText] = await Promise.all([
    run(['gh', 'issue', 'view', String(n), '--json', 'title,state,body,comments',
      '--jq', '{title, state, body, last: (.comments[-1].body // "")}']),
    run(['bash', `${top}/${STATUS_SCRIPT}`, 'get', String(n)]),
    run(['gh', 'pr', 'list', '--head', branch, '--state', 'all', '--limit', '1',
      '--json', 'number,isDraft,state']),
  ])
  const issue = json<IssueJson>(issueText)
  if (issue === null) return null
  return {
    number: n,
    title: issue.title,
    isClosed: issue.state === 'CLOSED',
    status: status === null || status === '(not in project)' ? null : status,
    marker: markerOf(issue.last),
    checkboxes: checkboxesOf(issue.body),
    pr: json<PullRequest[]>(prText)?.[0] ?? null,
  }
}

const leftoversIn = async (run: Run) => {
  const [porcelain, merged, closed] = await Promise.all([
    run(['git', 'worktree', 'list', '--porcelain']),
    run(['gh', 'pr', 'list', '--state', 'merged', '--limit', '200',
      '--json', 'headRefName', '--jq', '[.[].headRefName]']),
    run(['gh', 'issue', 'list', '--state', 'closed', '--limit', '200',
      '--json', 'number', '--jq', '[.[].number]']),
  ])
  const worktrees = worktreesOf(porcelain ?? '')
  if (worktrees.length === 0) return []
  return leftoversOf(worktrees, json<string[]>(merged) ?? [], json<number[]>(closed) ?? [])
}

/** git リポジトリの外なら null */
export async function collect($: EngineInterface, cwd: string): Promise<Snapshot | null> {
  const run: Run = argv => runIn($, cwd, argv)
  const [top, branch] = await Promise.all([
    run(['git', 'rev-parse', '--show-toplevel']),
    run(['git', 'rev-parse', '--abbrev-ref', 'HEAD']),
  ])
  if (top === null || branch === null) return null

  const n = issueOfBranch(branch)
  const [focus, leftovers, waitingTsv] = await Promise.all([
    n === null ? null : focusOf(run, top, n, branch),
    leftoversIn(run),
    n === null ? run(['bash', `${top}/${STATUS_SCRIPT}`, 'list', 'In Progress', 'Needs input']) : null,
  ])
  return {
    branch,
    focus,
    waiting: waitingTsv === null ? null : waitingOf(waitingTsv),
    leftovers,
    at: await $.clock.now(),
  }
}
