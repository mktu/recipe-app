'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { RecipeNoteDetail, RecipeNoteFields } from '@/types/recipe'
import { PlaceholderImagePicker } from './placeholder-image-picker'
import { NoteIngredientsEditor } from './note-ingredients-editor'
import { NoteStepsEditor } from './note-steps-editor'
import { useNoteForm } from './use-note-form'

interface NoteEditorProps {
  note: RecipeNoteDetail
  onSave: (fields: RecipeNoteFields) => Promise<void>
  onCancel: () => void
}

/** ノートをその場で編集する。保存すると図鑑のレシピ行にも書き戻される（PUT /api/notes/[id]） */
export function NoteEditor({ note, onSave, onCancel }: NoteEditorProps) {
  const { values, setters, toFields } = useNoteForm(note)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = toFields()
    if ('error' in result) return setError(result.error)
    setError(null)
    setIsSaving(true)
    try {
      await onSave(result.fields)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ノートの保存に失敗しました')
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h1 className="text-lg font-bold">ノートを編集</h1>
      <Field label="タイトル" htmlFor="note-title">
        <Input id="note-title" value={values.title} onChange={(e) => setters.setTitle(e.target.value)} disabled={isSaving} />
      </Field>
      <div className="flex gap-3">
        <Field label="分量" htmlFor="note-servings">
          <Input id="note-servings" value={values.servings} onChange={(e) => setters.setServings(e.target.value)} placeholder="2人分" disabled={isSaving} />
        </Field>
        <Field label="調理時間（分）" htmlFor="note-cooking-time">
          <Input id="note-cooking-time" type="number" inputMode="numeric" min={1} value={values.cookingTime} onChange={(e) => setters.setCookingTime(e.target.value)} disabled={isSaving} />
        </Field>
      </div>
      <PlaceholderImagePicker value={values.imageKey} onChange={setters.setImageKey} />
      <NoteIngredientsEditor rows={values.ingredients} onChange={setters.setIngredients} disabled={isSaving} />
      <NoteStepsEditor rows={values.steps} onChange={setters.setSteps} disabled={isSaving} />
      <Field label="メモ" htmlFor="note-memo">
        <Textarea id="note-memo" value={values.memo} onChange={(e) => setters.setMemo(e.target.value)} rows={3} disabled={isSaving} />
      </Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>キャンセル</Button>
        <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? '保存中...' : '保存する'}</Button>
      </div>
    </form>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
