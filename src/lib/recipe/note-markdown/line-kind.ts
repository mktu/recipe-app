/**
 * Markdown の1行を「見出し / 箇条書き / 番号付き / 地の文」に分類する
 */

export type SectionKind = 'ingredients' | 'steps' | 'memo'

/** 見出しの別名。比較は小文字化・空白除去したうえで完全一致 */
const SECTION_ALIASES: Record<SectionKind, string[]> = {
  ingredients: ['材料', '材料リスト', '食材', 'ingredients'],
  steps: ['手順', '作り方', 'つくり方', '調理手順', 'steps', 'instructions', 'directions'],
  memo: ['メモ', 'ポイント', 'コツ', 'コツ・ポイント', 'ポイント・コツ', '備考', 'memo', 'notes', 'tips'],
}

export type Line =
  | { type: 'blank' }
  /** `#` 見出し。`level` は `#` の数。太字だけの行は `BOLD_LINE_LEVEL` */
  | { type: 'heading'; level: number; text: string }
  /** 別名に一致した見出し（`#` でも `**材料**` `【材料】` `材料：` でもよい）。`note` は括弧の中身 */
  | { type: 'section'; kind: SectionKind; level: number | null; note: string | null }
  /** `indented` は字下げの有無。手順では入れ子の箇条書きを前の手順の続きとして扱う */
  | { type: 'bullet'; text: string; indented: boolean }
  | { type: 'numbered'; text: string; indented: boolean }
  | { type: 'text'; text: string }
  /** 表の行（`| 鶏むね肉 | 300g |`）。フォーマット違反なので中身は読まず、登録を止める */
  | { type: 'table' }

const HEADING = /^(#{1,6})\s+(.*?)\s*#*$/
/** `|` で始まり `|` で終わる行。区切り行（`|---|`）も含む */
const TABLE_ROW = /^\s*\|.*\|\s*$/
const BULLET = /^\s*(?:[-*+・●○◯◦]|•)\s*(.*)$/
/** `1.` `1)` `1．` `１、` `(1)` `（1）` `①` `Step 1:` */
const NUMBERED =
  /^\s*(?:(?:step\s*)?[0-9０-９]+\s*[.)．、:：）](?![0-9０-９])|[(（][0-9０-９]+[)）]|[①-⑳])\s*(.*)$/i
/** 見出しの飾り（太字・隅付き括弧・記号・末尾のコロン）を外す */
const DECORATION = /^[\s*_■□◆◇▼▽【<＜[［]+|[\s*_】>＞\]］:：]+$/g
/** 別名の後ろの補足。`材料（2人分）` */
const ALIAS_WITH_NOTE = /^(.+?)(?:\s*[(（](.*)[)）])?$/
/** `#` 見出しに限り、空白区切りの補足も認める。`## 材料 2人分` */
const ALIAS_WITH_SPACED_NOTE = /^(\S+?)\s+(.+)$/

/**
 * 太字だけの行（`**合わせ調味料**`）は、どの `#` より深い小見出しとして扱う。
 * 材料ではグループ、手順では読み飛ばし、前置きではタイトルの候補になる。
 * 地の文として読むと、材料では「合わせ調味料」という材料が登録されてしまう
 */
export const BOLD_LINE_LEVEL = 7
const BOLD_LINE = /^\s*\*\*([^*]+)\*\*\s*$/
/** 見出しに AI がよく付ける絵文字（🥬 材料 / 👩‍🍳 作り方）。結合文字と異体字セレクタも含める */
const EMOJI = /[\p{Extended_Pictographic}‍️⃣]/gu

/** 太字・斜体の記号を外す。`*` 単体は掛け算などで使われ得るので触らない */
export function stripInline(text: string): string {
  return text.replace(/\*\*|__/g, '').trim()
}

/** 見出しの文言を整える。絵文字は見出しにだけ付くので、本文からは外さない */
function headingText(text: string): string {
  return stripInline(text.replace(EMOJI, ''))
}

export function classifyLine(raw: string): Line {
  if (!raw.trim()) return { type: 'blank' }
  if (TABLE_ROW.test(raw)) return { type: 'table' }
  const heading = raw.match(HEADING)
  if (heading) return headingLine(heading[1].length, headingText(heading[2]))

  const section = matchSection(raw.replace(EMOJI, ''), null)
  if (section) return section

  const bold = raw.match(BOLD_LINE)
  if (bold) return { type: 'heading', level: BOLD_LINE_LEVEL, text: headingText(bold[1]) }

  const indented = /^(?: {2,}|\t|　)/.test(raw)
  const numbered = raw.match(NUMBERED)
  if (numbered) return { type: 'numbered', text: stripInline(numbered[1]), indented }
  const bullet = raw.match(BULLET)
  if (bullet && !raw.trim().startsWith('**')) return { type: 'bullet', text: stripInline(bullet[1]), indented }
  return { type: 'text', text: stripInline(raw) }
}

function headingLine(level: number, text: string): Line {
  return matchSection(text, level) ?? { type: 'heading', level, text }
}

/**
 * 飾りを外した文言が別名に一致すれば見出しとみなす
 *
 * `#` の無い行で空白区切りの補足を認めないのは、メモの「ポイント 火を通しすぎない」の
 * ような地の文を見出しと取り違えないため。
 */
function matchSection(raw: string, level: number | null): Line | null {
  const undecorated = raw.replace(DECORATION, '')
  const patterns = level === null ? [ALIAS_WITH_NOTE] : [ALIAS_WITH_NOTE, ALIAS_WITH_SPACED_NOTE]
  for (const pattern of patterns) {
    const parts = undecorated.match(pattern)
    const kind = parts && findSectionKind(parts[1])
    if (kind) return { type: 'section', kind, level, note: parts[2]?.trim() || null }
  }
  return null
}

function findSectionKind(word: string): SectionKind | null {
  const key = word.replace(/\s+/g, '').toLowerCase()
  const kinds = Object.keys(SECTION_ALIASES) as SectionKind[]
  return kinds.find((kind) => SECTION_ALIASES[kind].includes(key)) ?? null
}
