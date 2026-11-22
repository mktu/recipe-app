// 帯とペインの中身。要素（Box / Text）は呼び出し側が描画面から解決して渡す
import type { EngineInterface } from 'claude-code'

import type { Focus, Leftover, Snapshot } from '../types'
import { turnOf } from './parse'

type Elements = ReturnType<EngineInterface['ui']['resolve']>

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

const prLabel = (focus: Focus) => {
  const pr = focus.pr
  if (pr === null) return null
  if (pr.state === 'MERGED') return `PR #${pr.number} マージ済み`
  if (pr.state === 'CLOSED') return `PR #${pr.number} close`
  return `PR #${pr.number}${pr.isDraft ? ' Draft' : ''}`
}

const doneCount = (focus: Focus) => focus.checkboxes.filter(c => c.isDone).length

/** 帯の 1 行目に並べる要約 */
export const summaryOf = (snap: Snapshot): string | null => {
  const focus = snap.focus
  if (focus !== null) {
    const parts = [
      `#${focus.number} ${clip(focus.title, 32)}`,
      focus.isClosed ? 'close 済み' : `${focus.status ?? '-'} · ${turnOf(focus.status, focus.marker)}`,
      focus.checkboxes.length > 0 ? `☑ ${doneCount(focus)}/${focus.checkboxes.length}` : null,
      prLabel(focus),
    ]
    return parts.filter(p => p !== null).join(' │ ')
  }
  if (snap.waiting !== null) {
    const { inProgress, needsInput } = snap.waiting
    return `${snap.branch} │ In Progress ${inProgress} 件 · Needs input ${needsInput} 件（/work-issue）`
  }
  return null
}

export const leftoverLine = (leftovers: Leftover[]): string | null => {
  if (leftovers.length === 0) return null
  const names = leftovers.map(l => (l.issue === null ? l.branch : `#${l.issue}`)).join(', ')
  return `🧹 片付け忘れの worktree ${leftovers.length} 件（${names}）→ /end-session`
}

/** 帯に出すものが無い（Issue 番号も作業待ちの件数も片付け忘れも無い） */
export const isEmpty = (snap: Snapshot) => summaryOf(snap) === null && snap.leftovers.length === 0

export const Band = ({ ui, snap }: { ui: Elements; snap: Snapshot }) => {
  const { Box, Text } = ui
  const summary = summaryOf(snap)
  const leftover = leftoverLine(snap.leftovers)
  return (
    <Box flexDirection="column">
      {summary !== null && <Text dimColor>{summary}</Text>}
      {leftover !== null && <Text color="yellow">{leftover}</Text>}
    </Box>
  )
}

const FocusDetail = ({ ui, focus }: { ui: Elements; focus: Focus }) => {
  const { Box, Text } = ui
  return (
    <Box flexDirection="column">
      <Text bold>#{focus.number} {focus.title}</Text>
      <Text>Status: {focus.status ?? '-'}（{turnOf(focus.status, focus.marker)}）</Text>
      <Text>{prLabel(focus) ?? 'PR なし'}</Text>
      <Text> </Text>
      {focus.checkboxes.length === 0 && <Text dimColor>チェックボックスなし</Text>}
      {focus.checkboxes.map(c => (
        <Text dimColor={c.isDone}>{c.isDone ? '☑' : '☐'} {c.text}</Text>
      ))}
    </Box>
  )
}

const timeOf = (at: number) => new Date(at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

export const Detail = ({ ui, snap }: { ui: Elements; snap: Snapshot | null }) => {
  const { Box, Text } = ui
  if (snap === null) return <Text dimColor>git リポジトリの外、または読み込み中</Text>
  return (
    <Box flexDirection="column">
      {snap.focus !== null && <FocusDetail ui={ui} focus={snap.focus} />}
      {snap.focus === null && <Text>{summaryOf(snap) ?? `${snap.branch}（Issue 番号なし）`}</Text>}
      <Text> </Text>
      {snap.leftovers.length === 0 && <Text dimColor>片付け忘れの worktree なし</Text>}
      {snap.leftovers.map(l => (
        <Text color="yellow">🧹 {l.branch}  {l.path}</Text>
      ))}
      <Text dimColor>更新 {timeOf(snap.at)}（/issue で再取得）</Text>
    </Box>
  )
}
