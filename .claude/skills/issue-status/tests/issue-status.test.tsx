import { expect, test } from 'claude-code/testing'

const TOP = '/repo'
const WT = `${TOP}/.claude/worktrees`

/** argv を空白でつないだ文字列の先頭一致で、git / gh / project-status.sh の出力を返す */
const fake = (answers: [string, string][]) => (argv: readonly string[]) => {
  const line = argv.join(' ')
  const hit = answers.find(([prefix]) => line.startsWith(prefix))
  return hit
    ? { exitCode: 0, stdout: hit[1], stderr: '' }
    : { exitCode: 1, stdout: '', stderr: 'no fake' }
}

const PORCELAIN = [
  `worktree ${TOP}\nHEAD a\nbranch refs/heads/develop`,
  `worktree ${WT}/a\nHEAD b\nbranch refs/heads/feature/add-status-267`,
  `worktree ${WT}/b\nHEAD c\nbranch refs/heads/feature/fix-old-249`,
  `worktree ${WT}/c\nHEAD d\nbranch refs/heads/feature/docs-merged`,
].join('\n\n')

const COMMON: [string, string][] = [
  ['git rev-parse --show-toplevel', TOP],
  ['git worktree list --porcelain', PORCELAIN],
  ['gh pr list --state merged', '["feature/docs-merged"]'],
  ['gh issue list --state closed', '[249]'],
]

const ISSUE = JSON.stringify({
  title: '対応中の Issue の状況を一目で分かるようにする',
  state: 'OPEN',
  body: '## todo\n- [x] 帯\n- [ ] ペイン\n* [X] テスト\n',
  last: '<!-- work-issue:question -->\n論点です',
})

const start = async ($: any, on: any, answers: [string, string][]) => {
  on('process.run', (_: unknown, e: { argv: readonly string[] }) => ({
    value: fake([...answers, ...COMMON])(e.argv),
  }))
  on('session.cwd', () => ({ value: `${WT}/a` }))
  on('command.register', () => ({ value: { command: 'issue' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.every', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 0 }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: TOP, surface: 'terminal', isInteractive: true })
  await $.command.run({ command: 'issue', args: '' })
}

const BAND = {
  plugin: 'issue-status',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10 },
} as const

test('作業中の Issue の要約と、片付け忘れの worktree を帯に出す', async ($, on) => {
  await start($, on, [
    ['git rev-parse --abbrev-ref HEAD', 'feature/add-status-267'],
    ['gh issue view 267', ISSUE],
    ['bash /repo/.claude/skills/work-issue/scripts/project-status.sh get 267', 'Needs input'],
    ['gh pr list --head feature/add-status-267', '[{"number":268,"isDraft":true,"state":"OPEN"}]'],
  ])

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface } as never)
    const summary = await ui.find({ type: 'Text', text: /#267/ })
    expect(summary?.text).toBe(
      '#267 対応中の Issue の状況を一目で分かるようにする │ Needs input · あなたの番 │ ☑ 2/3 │ PR #268 Draft',
    )
    const leftover = await ui.find({ type: 'Text', text: /片付け忘れ/ })
    expect(leftover?.text).toBe('🧹 片付け忘れの worktree 2 件（#249, feature/docs-merged）→ /end-session')
    await ui.unmount()
  }
})

test('develop 上では作業待ちの件数を出す', async ($, on) => {
  await start($, on, [
    ['git rev-parse --abbrev-ref HEAD', 'develop'],
    ['bash /repo/.claude/skills/work-issue/scripts/project-status.sh list',
      '213\tIn Progress\tA\n252\tIn Progress\tB\n260\tNeeds input\tC'],
  ])

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' } as never)
  const summary = await ui.find({ type: 'Text', text: /develop/ })
  expect(summary?.text).toBe('develop │ In Progress 2 件 · Needs input 1 件（/work-issue）')
  await ui.unmount()
})
