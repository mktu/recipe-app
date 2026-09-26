'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { emptyStep, type StepRow } from './use-note-form'

interface NoteStepsEditorProps {
  rows: StepRow[]
  onChange: (rows: StepRow[]) => void
  disabled: boolean
}

/**
 * 手順の編集。並べ替えは持たない（スマホで削除ボタンが押しにくくなるため。
 * 順番を変えたいときは本文を書き換える）
 */
export function NoteStepsEditor({ rows, onChange, disabled }: NoteStepsEditorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">作り方</legend>
      {rows.map((row, index) => (
        <div key={row.key} className="flex items-start gap-2">
          <span aria-hidden className="pt-2 text-sm font-bold text-muted-foreground">{index + 1}</span>
          <Textarea
            aria-label={`手順${index + 1}`}
            value={row.text}
            onChange={(e) => onChange(rows.map((r) => (r.key === row.key ? { ...r, text: e.target.value } : r)))}
            rows={2}
            className="flex-1"
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`手順${index + 1}を削除`}
            onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyStep()])} disabled={disabled}>
        <Plus className="mr-1 h-4 w-4" />
        手順を追加
      </Button>
    </fieldset>
  )
}
