'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { IngredientsByCategory } from '@/types/recipe'

interface IngredientListProps {
  categories: IngredientsByCategory[]
  selectedIds: string[]
  onToggle: (id: string) => void
  isMaxReached: boolean
}

export function IngredientList({
  categories,
  selectedIds,
  onToggle,
  isMaxReached,
}: IngredientListProps) {
  return (
    <div className="space-y-6">
      {categories.map((group) => (
        <div key={group.category}>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">{group.category}</h4>
          <div className="flex flex-wrap gap-2">
            {group.ingredients.map((ing) => {
              const isSelected = selectedIds.includes(ing.id)
              const isDisabled = !isSelected && isMaxReached
              return (
                <Badge
                  key={ing.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  onClick={() => !isDisabled && onToggle(ing.id)}
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
