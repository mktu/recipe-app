'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { IngredientSelector } from './ingredient-selector'
import { useRecipeForm, type RecipeFormData } from './use-recipe-form'
import type { ParsedRecipe, IngredientsByCategory } from '@/types/recipe'

export type { RecipeFormData }

interface RecipeFormProps {
  url: string
  initialValues?: Partial<ParsedRecipe>
  ingredientCategories: IngredientsByCategory[]
  onSubmit: (data: RecipeFormData) => Promise<void>
  onBack: () => void
  isSubmitting: boolean
}

export function RecipeForm({ url, initialValues, ingredientCategories, onSubmit, onBack, isSubmitting }: RecipeFormProps) {
  const { values, setters, error, handleSubmit } = useRecipeForm({ initialValues, onSubmit })

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormField label="URL" labelClass="text-muted-foreground">
        <p className="truncate text-sm">{url}</p>
      </FormField>
      <FormField label="タイトル" required>
        <Input value={values.title} onChange={(e) => setters.setTitle(e.target.value)} placeholder="レシピのタイトル" disabled={isSubmitting} />
      </FormField>
      <FormField label="出典">
        <Input value={values.sourceName} onChange={(e) => setters.setSourceName(e.target.value)} placeholder="クックパッド、delish kitchen など" disabled={isSubmitting} />
      </FormField>
      <FormField label="画像URL">
        <Input value={values.imageUrl} onChange={(e) => setters.setImageUrl(e.target.value)} placeholder="https://..." disabled={isSubmitting} />
      </FormField>
      <FormField label="メイン食材">
        <IngredientSelector categories={ingredientCategories} selectedIds={values.ingredientIds} onSelectionChange={setters.setIngredientIds} />
      </FormField>
      <FormField label="メモ">
        <Textarea value={values.memo} onChange={(e) => setters.setMemo(e.target.value)} placeholder="自分用のメモ" rows={3} disabled={isSubmitting} />
      </FormField>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>戻る</Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存する'}</Button>
      </div>
    </form>
  )
}

interface FormFieldProps {
  label: string
  required?: boolean
  labelClass?: string
  children: React.ReactNode
}

function FormField({ label, required, labelClass, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label className={labelClass}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  )
}
