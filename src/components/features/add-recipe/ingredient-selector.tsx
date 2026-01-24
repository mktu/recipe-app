'use client'

import { useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useIngredients } from '@/hooks/use-ingredients'
import { useSelectedIngredients } from '@/hooks/use-selected-ingredients'
import { IngredientList } from './ingredient-list'
import type { IngredientsByCategory } from '@/types/recipe'

const MAX_INGREDIENTS = 5

interface SelectedBadgeProps {
  id: string
  name: string
  onRemove: (id: string) => void
}

function SelectedBadge({ id, name, onRemove }: SelectedBadgeProps) {
  return (
    <Badge variant="secondary" className="shrink-0 gap-1 py-1">
      {name || '...'}
      <button type="button" onClick={() => onRemove(id)} className="ml-1 rounded-full hover:bg-muted">
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

interface IngredientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  categories: IngredientsByCategory[]
  selectedIds: string[]
  onToggle: (id: string) => void
  isLoading: boolean
  isMaxReached: boolean
}

function IngredientSheet({ open, onOpenChange, selectedCount, categories, selectedIds, onToggle, isLoading, isMaxReached }: IngredientSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1" disabled={isMaxReached}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>メイン食材を選択（{selectedCount}/{MAX_INGREDIENTS}）</SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto px-4 pb-4">
          <IngredientList categories={categories} selectedIds={selectedIds} onToggle={onToggle} isLoading={isLoading} isMaxReached={isMaxReached} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface IngredientSelectorProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function IngredientSelector({ selectedIds, onSelectionChange }: IngredientSelectorProps) {
  const [open, setOpen] = useState(false)
  const { ingredientsByCategory, isLoading } = useIngredients()
  const { ingredients: selectedIngredients } = useSelectedIngredients(selectedIds)

  const toggleIngredient = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter((i) => i !== id))
      else if (selectedIds.length < MAX_INGREDIENTS) onSelectionChange([...selectedIds, id])
    },
    [selectedIds, onSelectionChange]
  )

  const removeIngredient = useCallback(
    (id: string) => onSelectionChange(selectedIds.filter((i) => i !== id)),
    [selectedIds, onSelectionChange]
  )

  const getIngredientName = useCallback(
    (id: string): string => {
      const selected = selectedIngredients.get(id)
      if (selected) return selected.name
      for (const group of ingredientsByCategory) {
        const found = group.ingredients.find((ing) => ing.id === id)
        if (found) return found.name
      }
      return ''
    },
    [selectedIngredients, ingredientsByCategory]
  )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {selectedIds.map((id) => (
          <SelectedBadge key={id} id={id} name={getIngredientName(id)} onRemove={removeIngredient} />
        ))}
        <IngredientSheet
          open={open}
          onOpenChange={setOpen}
          selectedCount={selectedIds.length}
          categories={ingredientsByCategory}
          selectedIds={selectedIds}
          onToggle={toggleIngredient}
          isLoading={isLoading}
          isMaxReached={selectedIds.length >= MAX_INGREDIENTS}
        />
      </div>
      <p className="text-xs text-muted-foreground">最大{MAX_INGREDIENTS}つまで選択できます</p>
    </div>
  )
}
