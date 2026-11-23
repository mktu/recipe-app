// 対応中の Issue の状況を、プロンプト上の帯と /issue のペインに出す（Issue #267）
// Skill ではなく mod。`.claude-plugin/plugin.json` があるので設定なしで自動で読み込まれる。
// 独自の JSX ランタイムのため ESLint・vitest からは `.claude/**` ごと除外している。
// 検証は `claude plugin validate` / `claude plugin test` にこのディレクトリを渡す（npm の CI は見ていない）。
// /work-issue の決まり事（ブランチ名・コメントの目印・project-status.sh の出力）に依存する。合わなくても落ちず、帯が欠けるだけ。
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { collect } from './collect'
import { Band, Detail, isEmpty } from './view'

const PANE = 'issue-status'
const REFRESH_MS = 5 * 60 * 1000
/** これらを実行した後は Status・PR・worktree が変わりうるので取り直す（git status 等の読むだけのものは除く） */
const TOUCHES_STATE =
  /\bgit\s+(-C\s+\S+\s+)?(commit|push|pull|merge|worktree|checkout|switch|branch)\b|\bgh\s+(pr|issue)\b|project-status\.sh/

// Snapshot の形を変えたら shape を上げる（リロード後も古い値が残るため）
const snapshot = atom({ plugin: 'issue-status', key: 'snapshot' } as const, null, {
  shape: 'snapshot-1',
})

let running: Promise<void> | null = null

/** 取得中なら相乗りする（git / gh を同時に何本も走らせない） */
function refresh($: EngineInterface): Promise<void> {
  running ??= (async () => {
    try {
      const snap = await collect($, await $.session.cwd())
      await update($, snapshot, () => snap)
    } finally {
      running = null
    }
  })()
  return running
}

export const register: Register = on => {
  running = null

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'issue',
      description: '対応中の Issue の詳細（チェックボックス・PR・片付け忘れの worktree）をペインに出す',
    })
    void refresh($)
    $.clock.every(REFRESH_MS, () => void refresh($))
    return next(e)
  })

  on('command.run', { command: 'issue' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Issue' })
    await refresh($)
    return { text: 'Issue の状況を取り直してペインに出しました。' }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (TOUCHES_STATE.test(e.command)) void refresh($)
    return ran
  })

  on('tool.call', { tool: 'EnterWorktree' }, async ($, e, next) => {
    const ran = await next(e)
    void refresh($)
    return ran
  })

  on('tool.call', { tool: 'ExitWorktree' }, async ($, e, next) => {
    const ran = await next(e)
    void refresh($)
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const snap = await read($, snapshot)
    if (e.props.hasSurvey || snap === null || isEmpty(snap)) return next(e)
    return <Band ui={$.ui.resolve(e)} snap={snap} />
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => (
    <Detail ui={$.ui.resolve(e)} snap={await read($, snapshot)} />
  ))
}
