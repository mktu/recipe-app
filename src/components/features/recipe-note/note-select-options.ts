/**
 * 何人分・調理時間の選択肢。
 *
 * 保存済みの値が選択肢に無い場合（Markdown 取り込み #177 で「作りやすい分量」「25分」など
 * 任意の値が入り得る）でも、編集を開いただけで値が消えないよう先頭に足して残す。
 */

export interface SelectOption {
  value: string
  label: string
}

const SERVINGS = ['1人分', '2人分', '3人分', '4人分', '5人分', '6人分']
const COOKING_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120]

function withCurrent(options: SelectOption[], current: string, label: string): SelectOption[] {
  if (!current || options.some((o) => o.value === current)) return options
  return [{ value: current, label }, ...options]
}

export function servingsOptions(current: string): SelectOption[] {
  return withCurrent(SERVINGS.map((s) => ({ value: s, label: s })), current, current)
}

export function cookingTimeOptions(current: string): SelectOption[] {
  const options = COOKING_MINUTES.map((m) => ({ value: String(m), label: `${m}分` }))
  return withCurrent(options, current, `${current}分`)
}
