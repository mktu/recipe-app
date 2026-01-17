'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { IngredientsByCategory } from '@/types/recipe'

interface IngredientCategoryListProps {
  categories: IngredientsByCategory[]
  selectedIds: string[]
  onToggle: (id: string) => void
  isLoading: boolean
}

export function IngredientCategoryList({
  categories,
  selectedIds,
  onToggle,
  isLoading,
}: IngredientCategoryListProps) {
  if (isLoading) {
    return <p className="text-center text-muted-foreground">読み込み中...</p>
  }

  return (
    <div className="space-y-6">
      {categories.map((group) => (
        <div key={group.category}>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">{group.category}</h4>
          <div className="flex flex-wrap gap-2">
            {group.ingredients.map((ing) => {
              const isSelected = selectedIds.includes(ing.id)
              return (
                <Badge
                  key={ing.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => onToggle(ing.id)}
                >
                  {ing.name}
                  {isSelected && <X className="ml-1 h-3 w-3" />}
                </Badge>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
