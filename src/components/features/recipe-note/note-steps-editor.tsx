'use client'

import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { emptyStep, type StepRow } from './use-note-form'

interface NoteStepsEditorProps {
  rows: StepRow[]
  onChange: (rows: StepRow[]) => void
  disabled: boolean
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** 手順の編集。途中に手順を差し込めるよう、並べ替えも用意する */
export function NoteStepsEditor({ rows, onChange, disabled }: NoteStepsEditorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-sm font-medium">作り方</legend>
      {rows.map((row, index) => (
        <div key={row.key} className="flex gap-2">
          <span aria-hidden className="pt-2 text-sm font-bold text-muted-foreground">{index + 1}</span>
          <Textarea
            aria-label={`手順${index + 1}`}
            value={row.text}
            onChange={(e) => onChange(rows.map((r) => (r.key === row.key ? { ...r, text: e.target.value } : r)))}
            rows={2}
            className="flex-1"
            disabled={disabled}
          />
          <StepControls
            index={index}
            count={rows.length}
            disabled={disabled}
            onMove={(to) => onChange(move(rows, index, to))}
            onRemove={() => onChange(rows.filter((r) => r.key !== row.key))}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyStep()])} disabled={disabled}>
        <Plus className="mr-1 h-4 w-4" />
        手順を追加
      </Button>
    </fieldset>
  )
}

interface StepControlsProps {
  index: number
  count: number
  disabled: boolean
  onMove: (to: number) => void
  onRemove: () => void
}

function StepControls({ index, count, disabled, onMove, onRemove }: StepControlsProps) {
  const label = `手順${index + 1}`
  return (
    <div className="flex flex-col">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`${label}を上へ`} onClick={() => onMove(index - 1)} disabled={disabled || index === 0}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`${label}を下へ`} onClick={() => onMove(index + 1)} disabled={disabled || index === count - 1}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`${label}を削除`} onClick={onRemove} disabled={disabled}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
