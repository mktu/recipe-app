'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emptyIngredient, type IngredientRow } from './use-note-form'

interface NoteIngredientsEditorProps {
  rows: IngredientRow[]
  onChange: (rows: IngredientRow[]) => void
  disabled: boolean
}

/** 材料の編集。名前と分量を分けて持つ（スクレイピング経路と違い、分量を正しく保存できる） */
export function NoteIngredientsEditor({ rows, onChange, disabled }: NoteIngredientsEditorProps) {
  const update = (key: number, patch: Partial<IngredientRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">材料</legend>
      {rows.map((row, index) => (
        <div key={row.key} className="flex gap-2">
          <Input
            aria-label={`材料${index + 1}の名前`}
            value={row.name}
            onChange={(e) => update(row.key, { name: e.target.value })}
            placeholder="なす"
            className="flex-1"
            disabled={disabled}
          />
          <Input
            aria-label={`材料${index + 1}の分量`}
            value={row.amount}
            onChange={(e) => update(row.key, { amount: e.target.value })}
            placeholder="2本"
            className="w-24"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`材料${index + 1}を削除`}
            onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyIngredient()])} disabled={disabled}>
        <Plus className="mr-1 h-4 w-4" />
        材料を追加
      </Button>
    </fieldset>
  )
}
