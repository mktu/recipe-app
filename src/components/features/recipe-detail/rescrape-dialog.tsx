'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { IngredientSelector } from '@/components/features/add-recipe/ingredient-selector'
import { useUpdateRecipe } from '@/hooks/use-update-recipe'
import type { IngredientRaw, IngredientsByCategory, ParsedRecipe, RecipeDetail } from '@/types/recipe'
import { fetchIngredientsByCategory } from '@/lib/db/queries/ingredients'

interface RescrapeDialogProps {
  recipe: RecipeDetail
  parsed: ParsedRecipe
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

function RescrapePreview({ imageUrl, ingredientsRaw }: { imageUrl: string; ingredientsRaw: IngredientRaw[] }) {
  return (
    <div className="space-y-4">
      {imageUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="レシピ画像" className="h-full w-full object-cover" />
        </div>
      )}
      {ingredientsRaw.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">取得した材料（{ingredientsRaw.length}件）</p>
          <ul className="space-y-1">
            {ingredientsRaw.map((ing, i) => (
              <li key={i} className="flex justify-between border-b border-border/50 pb-1 text-sm last:border-0">
                <span>{ing.name}</span>
                {ing.amount && <span className="text-muted-foreground">{ing.amount}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function RescrapeDialog({ recipe, parsed, open, onOpenChange, onSaved }: RescrapeDialogProps) {
  const { updateRecipe, isLoading: isSaving, error: saveError } = useUpdateRecipe(recipe.id)
  const [categories, setCategories] = useState<IngredientsByCategory[]>([])
  const [ingredientIds, setIngredientIds] = useState<string[]>(() => [...new Set(parsed.ingredientIds)])

  useEffect(() => {
    fetchIngredientsByCategory().then(({ data }) => setCategories(data))
  }, [])

  const handleSave = useCallback(async () => {
    const success = await updateRecipe({
      ingredientIds,
      ingredientsRaw: parsed.ingredientsRaw,
    })
    if (success) {
      onOpenChange(false)
      onSaved()
    }
  }, [updateRecipe, ingredientIds, parsed.ingredientsRaw, onOpenChange, onSaved])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>レシピ情報の再取得結果</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <RescrapePreview imageUrl={parsed.imageUrl} ingredientsRaw={parsed.ingredientsRaw ?? []} />
          <section className="space-y-3">
            <p className="text-sm font-medium">メイン食材</p>
            <p className="text-xs text-muted-foreground">食材検索で使われるタグです。</p>
            {categories.length > 0 && (
              <IngredientSelector categories={categories} selectedIds={ingredientIds} onSelectionChange={setIngredientIds} />
            )}
          </section>
          {saveError && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {saveError.message}
            </div>
          )}
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</> : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
