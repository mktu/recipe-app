/**
 * AI に出力させたレシピの Markdown をノートの入力に変換する（#177）
 *
 * 主な呼び出し元は LINE（#208）で、パース結果は確認画面を通らずにそのまま登録される。
 * 例外は投げず、読めた分と警告を返す。登録してよいかは `registrable` で判定する。
 * 仕様は docs/NOTE_MARKDOWN_FORMAT.md。
 */
import type { RecipeNoteFields } from '@/types/recipe'
import type { Line } from './line-kind'
import { findCookingTime, findServings } from './meta'
import { extractBodyLines } from './prefix'
import { parseIngredientLines, parseMemoLines, parseStepLines } from './section-parsers'
import { segment, type Section, type Segments } from './segment'
import type { ParseRecipeMarkdownResult, ParseWarning } from './types'

/** 接頭語の有無どちらでも受け付ける（あれば外す）。Web の貼り付け（#178）にも接頭語付きで来るため */
export function parseRecipeMarkdown(text: string): ParseRecipeMarkdownResult {
  const warnings: ParseWarning[] = []
  const { preamble, sections } = segment(extractBodyLines(text))

  const title = readTitle(preamble, warnings)
  const ingredients = parseIngredientLines(linesOf(sections, 'ingredients'), warnings)
  const steps = parseStepLines(linesOf(sections, 'steps'), warnings)
  const memoLines = sections.filter((s) => s.kind === 'memo').map((s) => parseMemoLines(s.lines))
  const memo = memoLines.map((lines) => lines.join('\n')).filter(Boolean).join('\n\n')
  const metaTexts = [...preamble.flatMap(textOf), ...memoLines.flat()]

  const fields: RecipeNoteFields = {
    title,
    ingredients,
    steps,
    imageKey: null,
    servings: readServings(sections, metaTexts),
    memo: memo || null,
    cookingTimeMinutes: readCookingTime(metaTexts, warnings),
  }
  warnUnknownSections(sections, warnings)
  if (steps.length === 0) warnings.push({ message: '手順がありません' })

  const blockingReasons = [
    ...(title ? [] : ['タイトルがありません']),
    ...(ingredients.length > 0 ? [] : ['材料がありません']),
  ]
  return { fields, warnings, registrable: blockingReasons.length === 0, blockingReasons }
}

/**
 * 材料と手順の見出しがそろっているか
 *
 * LINE で接頭語が付いていないのにレシピらしい文が来たとき、検索に流さず
 * 「先頭に [レシピ入力] を付けて送ってください」と案内するための判定（#208）。
 */
export function looksLikeRecipeMarkdown(text: string): boolean {
  const { sections } = segment(extractBodyLines(text))
  const kinds = new Set(sections.map((s) => s.kind))
  return kinds.has('ingredients') && kinds.has('steps')
}

function linesOf(sections: Segments['sections'], kind: Section['kind']): Line[] {
  return sections.filter((s) => s.kind === kind).flatMap((s) => s.lines)
}

function textOf(line: Line): string[] {
  return 'text' in line ? [line.text] : []
}

/**
 * 最初の見出しをタイトルにする（それより前の行は AI の前置きとして捨てる）。
 * 見出しが無ければ、メタ行でない最初の行をタイトルにして警告する。
 */
function readTitle(preamble: Line[], warnings: ParseWarning[]): string {
  const heading = preamble.find((l) => l.type === 'heading')
  if (heading && heading.type === 'heading') return heading.text
  const first = preamble.flatMap(textOf).find((t) => !isMetaLine(t))
  if (!first) return ''
  warnings.push({ message: 'タイトルの「#」が無かったため、最初の行をタイトルにしました', line: first })
  return first
}

function isMetaLine(text: string): boolean {
  return findCookingTime(text).found || findServings(text) !== null
}

/** 人数は `## 材料（2人分）` の括弧を優先し、無ければ `人数: 2人分` の行から取る */
function readServings(sections: Section[], metaTexts: string[]): string | null {
  const fromHeading = sections.find((s) => s.kind === 'ingredients' && s.note)?.note
  if (fromHeading) return fromHeading
  return metaTexts.map(findServings).find((s) => s !== null) ?? null
}

/** タイトル直下のメタ行を優先し、無ければメモの中から拾う。メモの本文はそのまま残す */
function readCookingTime(metaTexts: string[], warnings: ParseWarning[]): number | null {
  for (const text of metaTexts) {
    const found = findCookingTime(text)
    if (!found.found) continue
    if (found.minutes === null) {
      warnings.push({ message: `調理時間「${found.raw}」を読み取れませんでした`, line: text })
    }
    return found.minutes
  }
  return null
}

function warnUnknownSections(sections: Section[], warnings: ParseWarning[]): void {
  for (const section of sections) {
    if (section.kind !== 'unknown') continue
    warnings.push({ message: `「${section.note}」の内容は読み込んでいません` })
  }
}
