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
import { NoteSelect } from './note-select'
import { cookingTimeOptions, servingsOptions } from './note-select-options'
import { useNoteForm, type IngredientOption } from './use-note-form'

interface NoteEditorProps {
  note: RecipeNoteDetail
  ingredients: IngredientOption[]
  onSave: (fields: RecipeNoteFields) => Promise<void>
  onCancel: () => void
}

/** ノートをその場で編集する。保存すると図鑑のレシピ行にも書き戻される（PUT /api/notes/[id]） */
export function NoteEditor({ note, ingredients, onSave, onCancel }: NoteEditorProps) {
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
      <Field label="タイトル" htmlFor="note-title" required>
        <Input id="note-title" required value={values.title} onChange={(e) => setters.setTitle(e.target.value)} disabled={isSaving} />
      </Field>
      <div className="flex gap-3">
        <Field label="何人分" htmlFor="note-servings">
          <NoteSelect id="note-servings" value={values.servings} onChange={setters.setServings} options={servingsOptions(note.servings ?? '')} disabled={isSaving} />
        </Field>
        <Field label="調理時間" htmlFor="note-cooking-time">
          <NoteSelect id="note-cooking-time" value={values.cookingTime} onChange={setters.setCookingTime} options={cookingTimeOptions(note.cookingTimeMinutes?.toString() ?? '')} disabled={isSaving} />
        </Field>
      </div>
      <PlaceholderImagePicker value={values.imageKey} onChange={setters.setImageKey} />
      <NoteIngredientsEditor rows={values.ingredients} onChange={setters.setIngredients} ingredients={ingredients} disabled={isSaving} />
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

interface FieldProps {
  label: string
  htmlFor: string
  /** 必須マークを付ける。入力側にも `required` を付けて、支援技術に必須を伝えること */
  required?: boolean
  children: React.ReactNode
}

function Field({ label, htmlFor, required, children }: FieldProps) {
  return (
    <div className="flex-1 space-y-2">
      <Label htmlFor={htmlFor}>{label}{required && <span aria-hidden className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  )
}
