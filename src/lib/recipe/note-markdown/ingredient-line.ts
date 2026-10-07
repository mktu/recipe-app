/**
 * 材料の1行を名前と分量に分ける
 *
 * `normalizeIngredientName()` は使わない。あれは食材マスタとの照合用にブランド名や切り方まで
 * 削るので、表示用の名前に使うと「キッコーマン醤油」が「醤油」になる。照合は保存時に
 * サーバー側で別に走る。ここで判定するのは「分量らしさ」だけ。
 */
import type { IngredientRaw } from '@/types/recipe'

const DIGIT = '[0-9０-９]'
const QUALIFIER = '(?:約|およそ|各)?'
/**
 * 数字の続き。範囲の記号は `〜`（波ダッシュ）`~` に加え、Windows の IME が出す全角チルダ `～` も含める。
 * `と` は数字に挟まれたときだけ（`大さじ1と1/2`）
 */
const DIGIT_CONTINUATION = '(?:[0-9０-９./／〜~～\\-・]|と(?=[0-9０-９]))*'

/** 数字で始まる分量。`300g` `1/2個` `2〜3本` `1かけ（10g）` */
const NUMERIC_AMOUNT = `${DIGIT}${DIGIT_CONTINUATION}\\s*[^\\s0-9０-９]{0,6}(?:[(（][^)）]*[)）])?`
/** 計量スプーン・カップ。`大さじ2` `小さじ1/2` `大さじ1と1/2` `1カップ` */
const SPOON_AMOUNT = `(?:大さじ|小さじ|カップ)\\s*${DIGIT}${DIGIT_CONTINUATION}(?:[(（][^)）]*[)）])?`
/** 数字を含まない分量 */
const WORD_AMOUNT =
  '少々|適量|適宜|少量|ひとつまみ|ひとつかみ|ひとかけ|お好みで|好みで|お好み|たっぷり|半分|1片'

const AMOUNT = `${QUALIFIER}(?:${SPOON_AMOUNT}|${NUMERIC_AMOUNT}|${WORD_AMOUNT})`
const AMOUNT_ONLY = new RegExp(`^${AMOUNT}$`)
/** 空白なしで名前に続く分量。`鶏むね肉300g` `酒大さじ2` */
const TRAILING_AMOUNT = new RegExp(`^(.+?)(${QUALIFIER}(?:${SPOON_AMOUNT}|${DIGIT}.*|${WORD_AMOUNT}))$`)

/** 名前と分量の区切りとして明示的に使われる記号 */
const EXPLICIT_SEPARATOR = /\s*(?:[:：]|…+|\.{3,}|・{2,}|─+|—+|\t)\s*/

export function looksLikeAmount(text: string): boolean {
  return AMOUNT_ONLY.test(text.trim())
}

/**
 * 材料の1行（箇条書きの記号は外したもの）を `{name, amount}` に分ける。
 * 分量が見つからなければ行全体を名前にする（「塩」だけの行は普通にある）。
 */
export function splitIngredientLine(text: string): IngredientRaw {
  const line = text.trim()
  return (
    splitByExplicitSeparator(line) ??
    splitByLastSpace(line) ??
    splitByTrailingAmount(line) ?? { name: line, amount: '' }
  )
}

function splitByExplicitSeparator(line: string): IngredientRaw | null {
  const match = line.match(EXPLICIT_SEPARATOR)
  if (!match || match.index === undefined || match.index === 0) return null
  const name = line.slice(0, match.index).trim()
  const amount = line.slice(match.index + match[0].length).trim()
  return name && amount ? { name, amount } : null
}

/** 最後の空白（全角を含む）で分け、後ろが分量らしければ採用する */
function splitByLastSpace(line: string): IngredientRaw | null {
  const match = line.match(/^(.+)[\s　]+(\S+)$/)
  if (!match || !looksLikeAmount(match[2])) return null
  return { name: match[1].trim(), amount: match[2] }
}

function splitByTrailingAmount(line: string): IngredientRaw | null {
  const match = line.match(TRAILING_AMOUNT)
  if (!match || !looksLikeAmount(match[2])) return null
  return { name: match[1].trim(), amount: match[2] }
}

/** 括弧や記号で囲まれた短い行。`【A】` `＜たれ＞` `■合わせ調味料` `A:` */
const GROUP_LABEL = /^(?:[【<＜[［(（]([^】>＞\]］)）]{1,15})[】>＞\]］)）]|[■□◆◇◎●○]\s*(.{1,15})|(.{1,15})[:：])$/

/**
 * 材料セクションの中のグループ見出しなら、その名前を返す
 *
 * 「A を加える」のように手順から参照されるので捨てずに分量の側へ残す（`withGroup`）。
 * 名前の側に付けないのは、食材マスタとの照合で「A醤油」になって外れるため。
 */
export function parseGroupLabel(text: string): string | null {
  const match = text.trim().match(GROUP_LABEL)
  if (!match) return null
  // `◎醤油 大さじ2` は見出しではなく、記号で揃えた材料の行（日本語のレシピの定番）
  if (match[2] && splitIngredientLine(match[2]).amount) return null
  return (match[1] ?? match[2] ?? match[3]).trim() || null
}

/** 行頭のグループ記号。`【A】醤油 大さじ1` `(A)みりん 大さじ1` */
const INLINE_GROUP = /^[【[［(（<＜]([^】\]］)）>＞]{1,4})[】\]］)）>＞]\s*(.+)$/
/** 行頭の記号で揃えた材料。`◎醤油 大さじ2`。手順で「◎を合わせる」と参照されるので記号をグループにする */
const INLINE_SYMBOL_GROUP = /^([■□◆◇◎☆★])\s*(.+)$/

/** 材料名の前にグループが書かれていれば分ける。名前に残すと照合で「A醤油」になって外れる */
export function splitInlineGroup(text: string): { group: string | null; text: string } {
  const match = text.match(INLINE_GROUP) ?? text.match(INLINE_SYMBOL_GROUP)
  return match ? { group: match[1].trim(), text: match[2] } : { group: null, text }
}

export function withGroup(ingredient: IngredientRaw, group: string | null): IngredientRaw {
  if (!group) return ingredient
  const amount = ingredient.amount ? `${ingredient.amount}（${group}）` : `（${group}）`
  return { ...ingredient, amount }
}
