'use client'

import type { SelectOption } from './note-select-options'

interface NoteSelectProps {
  id: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled: boolean
}

const SELECT_CLASS =
  'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none ' +
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'

/**
 * 何人分・調理時間の選択欄。ネイティブの `<select>` にして、スマホでは OS のピッカーに任せる。
 * 任意項目なので先頭に「未設定」を置く。
 */
export function NoteSelect({ id, value, onChange, options, disabled }: NoteSelectProps) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={SELECT_CLASS} disabled={disabled}>
      <option value="">未設定</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
