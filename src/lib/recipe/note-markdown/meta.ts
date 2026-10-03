/**
 * 調理時間・人数のメタ行
 *
 * 仕様では `調理時間: 20分` `人数: 2人分` を1行で書く。タイトル直下でもメモの中でも拾う。
 * メモの中の文（「冷蔵で2日。調理時間20分」）からも調理時間だけは拾う。
 */

const COOKING_TIME_LABEL = /調理時間\s*[:：]?\s*(?:約|およそ)?\s*([^\s。、,，]+)/
const SERVINGS_LINE = /^\s*(?:人数|分量)\s*[:：]\s*(.+?)\s*$/

const toHalfWidth = (s: string) => s.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))

/**
 * 「20分」「1時間」「1時間30分」「1.5時間」「20〜30分」を分に直す。範囲は長いほうを取る。
 * 読めなければ null
 */
export function parseDurationMinutes(text: string): number | null {
  const normalized = toHalfWidth(text).replace(/\s/g, '')
  const range = normalized.match(/^[\d.]+[〜~\-]([\d.]+.*)$/)
  const target = range ? range[1] : normalized
  const match = target.match(/^(?:([\d.]+)時間(?:半)?)?(?:([\d.]+)分)?/)
  if (!match || (!match[1] && !match[2])) return null
  const hours = Number(match[1] ?? 0) + (target.includes('時間半') ? 0.5 : 0)
  const minutes = Math.round(hours * 60 + Number(match[2] ?? 0))
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null
}

/**
 * 行の中から調理時間を探す
 *
 * - `found: false` … 「調理時間」の記述が無い
 * - `minutes: null` … 記述はあるが読めない（警告の対象）
 */
export function findCookingTime(line: string): { found: false } | { found: true; minutes: number | null; raw: string } {
  const match = line.match(COOKING_TIME_LABEL)
  if (!match) return { found: false }
  return { found: true, minutes: parseDurationMinutes(match[1]), raw: match[1] }
}

/** `人数: 2人分` の行なら値を返す */
export function findServings(line: string): string | null {
  return line.match(SERVINGS_LINE)?.[1] ?? null
}
