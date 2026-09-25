'use client'

import { useMemo, useState, type FocusEvent } from 'react'
import { Input } from '@/components/ui/input'
import { filterIngredientsByQuery, toKatakana } from '@/lib/recipe/search-ingredient'
import type { IngredientOption } from './use-note-form'

const MAX_SUGGESTIONS = 6

/** 前方一致を先に並べる（「な」で「スナップエンドウ」より「なす」を先に出す）。入力済みの名前そのものは出さない */
function suggest(ingredients: IngredientOption[], query: string): IngredientOption[] {
  const q = toKatakana(query.trim().toLowerCase())
  const startsWith = (i: IngredientOption) => toKatakana(i.name.toLowerCase()).startsWith(q)
  return filterIngredientsByQuery(ingredients, query)
    .filter((i) => i.name !== query.trim())
    .sort((a, b) => Number(startsWith(b)) - Number(startsWith(a)))
    .slice(0, MAX_SUGGESTIONS)
}

interface IngredientNameInputProps {
  label: string
  /** 候補一覧の名前（「材料1」）。入力欄の label を含めると getByLabel が両方に当たるので分ける */
  groupLabel: string
  value: string
  onChange: (value: string) => void
  ingredients: IngredientOption[]
  disabled: boolean
}

/**
 * 材料名の入力欄。食材マスタから部分一致で候補を出し、タップで埋める。
 *
 * 絞り込みは食材検索と同じ `filterIngredientsByQuery`（ひらがな/カタカナを区別しない）。
 * ネイティブの `<datalist>` はこの正規化ができず「きゃ」で「キャベツ」が出ないので使わない。
 * 調味料などマスタに無い材料も書けるよう、候補は補助にとどめて自由入力を許す。
 * 候補はボタンなので、フォーカスが候補に移っても一覧は閉じない（外に出たら閉じる）。
 *
 * 候補は下の行に重ねて出す（絶対配置）。流し込むと出るたびに下の行が押し下げられて、
 * 押そうとした場所がずれる。位置の基準は親の行（`relative`）で、行の幅いっぱいに広げる。
 */
export function IngredientNameInput({ label, groupLabel, value, onChange, ingredients, disabled }: IngredientNameInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const suggestions = useMemo(() => suggest(ingredients, value), [ingredients, value])

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsFocused(false)
  }

  return (
    <div className="flex-1" onFocus={() => setIsFocused(true)} onBlur={handleBlur}>
      <Input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder="なす" autoComplete="off" disabled={disabled} />
      {isFocused && suggestions.length > 0 && (
        <div
          role="group"
          aria-label={`${groupLabel}の候補`}
          className="absolute inset-x-0 top-full z-10 mt-1 flex flex-wrap gap-1 rounded-md border bg-popover p-2 shadow-md"
        >
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted"
              onClick={() => { onChange(s.name); setIsFocused(false) }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
