'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RecipeWithIngredients } from '@/types/recipe'

interface RecipeCardProps {
  recipe: RecipeWithIngredients
  onClick: () => void
}

const badgeClass = 'rounded-full px-2.5 py-0.5 text-xs font-normal'

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const displayIngredients = recipe.mainIngredients.slice(0, 3)
  const extraCount = recipe.mainIngredients.length - 3

  return (
    <Card className="cursor-pointer p-4 transition-colors hover:bg-muted/50" onClick={onClick}>
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {recipe.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">🍳</div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
          <div>
            <h3 className="font-semibold leading-tight">{recipe.title}</h3>
            {recipe.source_name && (
              <p className="mt-1 text-sm text-muted-foreground">{recipe.source_name}</p>
            )}
          </div>
          {displayIngredients.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 overflow-hidden">
              {displayIngredients.map((ing) => (
                <Badge key={ing.id} variant="secondary" className={badgeClass}>
                  <span className="max-w-[80px] truncate">{ing.name}</span>
                </Badge>
              ))}
              {extraCount > 0 && (
                <Badge variant="secondary" className={badgeClass}>
                  +{extraCount}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
