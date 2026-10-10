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
import { RECIPE_INPUT_END_MARKER, extractBodyLines, hasRecipeInputEndMarker, hasRecipeInputPrefix } from './prefix'
import { RECIPE_PROMPT_EXAMPLE } from './prompt'
import { parseIngredientLines, parseMemoLines, parseStepLines } from './section-parsers'
import { segment, type Section, type Segments } from './segment'
import type { ParseRecipeMarkdownResult, ParseWarning } from './types'

/** 接頭語の有無どちらでも受け付ける（あれば外す）。Web の貼り付け（#178）にも接頭語付きで来るため */
export function parseRecipeMarkdown(text: string): ParseRecipeMarkdownResult {
  const { fields, warnings, blockingReasons } = readRecipe(text)
  const reasons = isPromptExample(fields) ? [PROMPT_EXAMPLE_REASON] : blockingReasons
  return { fields, warnings, registrable: reasons.length === 0, blockingReasons: reasons }
}

/** 見本の判定を除いた読み取り。見本そのものを読むときに判定を再帰させないため分けている */
function readRecipe(text: string): Omit<ParseRecipeMarkdownResult, 'registrable'> {
  const warnings: ParseWarning[] = []
  const { preamble, sections } = segment(extractBodyLines(text))

  const title = readTitle(preamble, warnings)
  const ingredients = sectionsOf(sections, 'ingredients').flatMap((s) => parseIngredientLines(s.lines, warnings))
  const steps = sectionsOf(sections, 'steps').flatMap((s) => parseStepLines(s.lines, warnings))
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
  if (looksTruncated(text)) warnings.unshift({ message: TRUNCATED_WARNING })

  const blockingReasons = [
    ...(title ? [] : ['タイトルがありません']),
    ...(ingredients.length > 0 ? [] : ['材料がありません']),
    ...(hasTable(preamble, sections) ? [TABLE_REASON] : []),
  ]
  return { fields, warnings, blockingReasons }
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

/**
 * 接頭語があるのに終端マーカーが無い入力は、途中で切れた強い兆候（#208）
 *
 * AI 用プロンプト（#214）は両方を必ず出力させる。LINE で長い出力が分割されたり、コピーが途中で
 * 切れたりすると、前半だけが手順の欠けたノートとして登録される。マーカーの無い入力も受け付ける
 * 後方互換は保ちたいので、登録は止めずに警告だけにする（返信の上限に埋もれないよう先頭に置く）
 */
const TRUNCATED_WARNING = `最後の ${RECIPE_INPUT_END_MARKER} が見当たりません。途中で切れている可能性があります`

function looksTruncated(text: string): boolean {
  return hasRecipeInputPrefix(text) && !hasRecipeInputEndMarker(text)
}

/**
 * 表はフォーマット違反として登録を止める（プロンプトで禁止している）。
 * 読めた分だけ黙って登録すると、表にあった材料が抜けていることにユーザーが気付けない
 */
const TABLE_REASON = '表が含まれています。表を使わない形式で出力し直してください'

function hasTable(preamble: Line[], sections: Section[]): boolean {
  return [...preamble, ...sections.flatMap((s) => s.lines)].some((l) => l.type === 'table')
}

/**
 * AI 用プロンプト（#214）の出力例そのものは登録しない。経路は2つ:
 * 文面をそのまま送り返したとき（出力例は行頭に接頭語を持つ）と、会話が薄いまま渡されて AI が見本をなぞったとき。
 * 材料は名前だけで比べ、AI が分量だけ変えてなぞった場合も拾う
 */
const PROMPT_EXAMPLE_REASON =
  'AI 用プロンプトの見本のレシピです。プロンプトを AI に渡して、会話で決めたレシピを出力させてください'

let exampleFields: RecipeNoteFields | undefined

function isPromptExample(fields: RecipeNoteFields): boolean {
  exampleFields ??= readRecipe(RECIPE_PROMPT_EXAMPLE).fields
  const names = (f: RecipeNoteFields) => f.ingredients.map((i) => i.name).join('\n')
  return fields.title === exampleFields.title && names(fields) === names(exampleFields)
}

/**
 * 同じ種類のセクションを文書順に返す（「下ごしらえ」と「作り方」はどちらも手順）。
 * 読み取りはセクションごとに行い、番号の有無やグループがセクションをまたいで影響しないようにする
 */
function sectionsOf(sections: Segments['sections'], kind: Section['kind']): Section[] {
  return sections.filter((s) => s.kind === kind)
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
