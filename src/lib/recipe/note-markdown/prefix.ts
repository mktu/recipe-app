/**
 * 「これはパースしてほしいレシピ」を示す接頭語と、本文の切り出し（#177 / #208）
 *
 * LINE では普通の検索ワードと区別するため、AI 用プロンプトで接頭語を出力させる。
 * 仕様は docs/NOTE_MARKDOWN_FORMAT.md。
 */

/** AI 用プロンプトに出力させる接頭語。表記はこれを正とする */
export const RECIPE_INPUT_PREFIX = '[レシピ入力]'

/**
 * 終端マーカー。AI 用プロンプトで最終行に出力させ、これより後ろ（締めの言葉）を捨てる。
 * プロンプトで「Markdown 以外は出力しない」と指示しても締めの一文は漏れやすく、
 * LINE はワンパスなので漏れるとメモに入ったまま登録される。無ければ今までどおり読む
 */
export const RECIPE_INPUT_END_MARKER = '[ここまで]'

/** 括弧の表記ゆれ（[] / 【】 / 全角の［］）と前後の空白を許容する */
const PREFIX_PATTERN = /^\s*[[［【]\s*レシピ入力\s*[\]］】]\s*/
/** 終端マーカーは、それだけで1行を成すときに限る（手順の文中の言及で切らないため） */
const END_MARKER_PATTERN = /^\s*[[［【]\s*ここまで\s*[\]］】]\s*$/

const FENCE_PATTERN = /^\s*(```|~~~)/

/** 改行を LF に揃えて行に分ける */
export function toLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n')
}

/**
 * 接頭語で始まる行があるか
 *
 * 1行目に限らないのは、AI の出力をコピーすると「いいですね！」のような前置きが
 * 付いてくることがあるため。行頭にあるときだけ認め、文中の言及には反応しない。
 */
export function hasRecipeInputPrefix(text: string): boolean {
  return toLines(text).some((line) => PREFIX_PATTERN.test(line))
}

/** 終端マーカーだけの行があるか */
export function hasRecipeInputEndMarker(text: string): boolean {
  return toLines(text).some((line) => END_MARKER_PATTERN.test(line))
}

/**
 * パース対象の本文を行の配列で返す
 *
 * 1. 接頭語の行があれば、そこより前（前置き）を捨て、接頭語そのものを外す
 * 2. 終端マーカーの行があれば、そこから後ろ（締めの言葉）を捨てる
 * 3. コードフェンスで囲まれていれば、最初のブロックの中身だけを取る
 */
export function extractBodyLines(text: string): string[] {
  return stripFence(stripAfterEndMarker(stripPrefix(toLines(text))))
}

function stripAfterEndMarker(lines: string[]): string[] {
  const index = lines.findIndex((line) => END_MARKER_PATTERN.test(line))
  return index < 0 ? lines : lines.slice(0, index)
}

function stripPrefix(lines: string[]): string[] {
  const index = lines.findIndex((line) => PREFIX_PATTERN.test(line))
  if (index < 0) return lines
  const rest = lines[index].replace(PREFIX_PATTERN, '')
  return [rest, ...lines.slice(index + 1)]
}

/**
 * フェンスが2本以上あれば最初のブロックの中身を取る。
 * 1本だけのときは、前に本文があれば閉じフェンス（接頭語がフェンスの中にあった場合）、
 * 無ければ閉じ忘れの開きフェンスとみなす。
 */
function stripFence(lines: string[]): string[] {
  const fences = lines.flatMap((line, i) => (FENCE_PATTERN.test(line) ? [i] : []))
  if (fences.length === 0) return lines
  const [first, second] = fences
  if (second !== undefined) return lines.slice(first + 1, second)
  const hasBodyBefore = lines.slice(0, first).some((line) => line.trim())
  return hasBodyBefore ? lines.slice(0, first) : lines.slice(first + 1)
}
