/**
 * セクションごとの読み取り（材料・手順・メモ）
 *
 * LINE ではパース結果がそのまま登録される（確認画面が無い）ので、読み取れない行は
 * 推測で混ぜず、読み飛ばして警告に回す。
 */
import type { IngredientRaw } from '@/types/recipe'
import type { Line } from './line-kind'
import { parseGroupLabel, splitIngredientLine, splitInlineGroup, withGroup } from './ingredient-line'
import type { ParseWarning } from './types'

/** 地の文が材料として不自然か（注意書き・文章）。読み飛ばして警告にする */
function isProse(text: string): boolean {
  return text.startsWith('※') || text.includes('。') || text.length > 30
}

export function parseIngredientLines(lines: Line[], warnings: ParseWarning[]): IngredientRaw[] {
  const ingredients: IngredientRaw[] = []
  let group: string | null = null
  for (const line of lines) {
    const read = readIngredientLine(line)
    if (read.kind === 'group') group = read.group
    if (read.kind === 'ingredient') ingredients.push(withGroup(read.ingredient, read.group ?? group))
    if (read.kind === 'skip') warnings.push({ message: '材料として読めない行を読み飛ばしました', line: read.line })
  }
  return ingredients
}

type IngredientLineRead =
  | { kind: 'group'; group: string }
  | { kind: 'ingredient'; ingredient: IngredientRaw; group: string | null }
  | { kind: 'skip'; line: string }
  | { kind: 'ignore' }

function readIngredientLine(line: Line): IngredientLineRead {
  if (line.type === 'heading') return { kind: 'group', group: parseGroupLabel(line.text) ?? line.text }
  if (line.type !== 'bullet' && line.type !== 'numbered' && line.type !== 'text') return { kind: 'ignore' }
  const label = parseGroupLabel(line.text)
  if (label) return { kind: 'group', group: label }
  if (line.type === 'text' && isProse(line.text)) return { kind: 'skip', line: line.text }
  const inline = splitInlineGroup(line.text)
  return { kind: 'ingredient', ingredient: splitIngredientLine(inline.text), group: inline.group }
}

/**
 * 手順を読む
 *
 * - 番号や箇条書きが1つも無ければ、1行を1手順とする
 * - 番号付きの中では、直後に続く地の文と字下げされた箇条書きは前の手順の続きとする
 * - 空行を挟んだ地の文（AI の締めの言葉など）は読み飛ばして警告にする
 */
export function parseStepLines(lines: Line[], warnings: ParseWarning[]): string[] {
  const hasList = lines.some((l) => l.type === 'numbered' || l.type === 'bullet')
  if (!hasList) return lines.flatMap((l) => (l.type === 'text' ? [l.text] : []))

  const steps: string[] = []
  /** 直前の行が手順に取り込まれたか。読み飛ばした行・空行の後ろは続きにしない */
  let attached = false
  for (const line of lines) {
    const kind = classifyStepLine(line, attached, steps.length > 0)
    if (kind === 'new') steps.push(textOf(line))
    if (kind === 'continuation') steps[steps.length - 1] = joinStep(steps[steps.length - 1], line)
    if (kind === 'skip') warnings.push({ message: '手順の番号が無い行を読み飛ばしました', line: textOf(line) })
    attached = kind === 'new' || kind === 'continuation'
  }
  return steps
}

type StepLineKind = 'new' | 'continuation' | 'skip' | 'ignore'

function classifyStepLine(line: Line, attached: boolean, hasStep: boolean): StepLineKind {
  if (line.type === 'numbered' || line.type === 'bullet') {
    return line.indented && hasStep ? 'continuation' : 'new'
  }
  if (line.type !== 'text') return 'ignore'
  return attached ? 'continuation' : 'skip'
}

const SENTENCE_END = /[。．.!！?？)）」』]$/

/**
 * 続きの行を前の手順につなぐ
 *
 * 地の文は折り返し（「鍋に湯を沸かし、」+「塩を入れる」）なのでそのままつなぐ。
 * 子箇条書きは別の文なので、前の文が句読点で終わっていなければ「。」を挟む
 */
function joinStep(previous: string, line: Line): string {
  const isSubItem = line.type === 'bullet' || line.type === 'numbered'
  const separator = isSubItem && !SENTENCE_END.test(previous) ? '。' : ''
  return previous + separator + textOf(line)
}

function textOf(line: Line): string {
  return 'text' in line ? line.text : ''
}

/** メモは書かれたとおりに残す。箇条書きは記号を「・」に揃える */
export function parseMemoLines(lines: Line[]): string[] {
  return lines.flatMap((line) => {
    if (line.type === 'bullet') return [`・${line.text}`]
    if (line.type === 'numbered' || line.type === 'text') return [line.text]
    if (line.type === 'heading') return [line.text]
    return []
  })
}
