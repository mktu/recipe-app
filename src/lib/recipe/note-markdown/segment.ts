/**
 * 本文の行を「前置き（タイトル・メタ行）」と見出しごとのセクションに分ける
 */
import { classifyLine, type Line, type SectionKind } from './line-kind'

export interface Section {
  /** `unknown` は別名に一致しない見出し。中身は読まない（将来のセクション追加で壊れないため） */
  kind: SectionKind | 'unknown'
  /** `#` の数。`**材料**` のような `#` の無い見出しは null */
  level: number | null
  /** 見出しの括弧の中身（材料なら人数）、または未知の見出しの文言 */
  note: string | null
  lines: Line[]
}

export interface Segments {
  /** 最初のセクションより前の行 */
  preamble: Line[]
  sections: Section[]
}

export function segment(rawLines: string[]): Segments {
  const result: Segments = { preamble: [], sections: [] }
  for (const raw of rawLines) {
    const line = classifyLine(raw)
    const current = result.sections.at(-1)
    if (line.type === 'section' && !isInsideUnknown(line.level, current)) {
      result.sections.push({ kind: line.kind, level: line.level, note: line.note, lines: [] })
    } else if (line.type === 'heading' && current && !isSubHeading(line.level, current)) {
      result.sections.push({ kind: 'unknown', level: line.level, note: line.text, lines: [] })
    } else {
      ;(current?.lines ?? result.preamble).push(line)
    }
  }
  return result
}

/**
 * セクションより深い `#` 見出しは、そのセクションの中の小見出しとして扱う（材料の `### たれ` など）。
 * セクション自体に `#` が無いときは `###` 以上を小見出しとする。
 */
function isSubHeading(level: number, section: Section): boolean {
  return section.level === null ? level >= 3 : level > section.level
}

/**
 * 未知のセクションの中にある、より深い `### 材料` は本体の材料として拾わない。
 * 将来 `## アレンジ: 時短` の下に `### 材料` を持たせたとき、本体の材料に混ざらないようにする。
 */
function isInsideUnknown(level: number | null, current: Section | undefined): boolean {
  if (current?.kind !== 'unknown' || level === null || current.level === null) return false
  return level > current.level
}
