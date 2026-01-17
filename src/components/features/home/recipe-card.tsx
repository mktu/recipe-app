'use client'

import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RecipeWithIngredients } from '@/types/recipe'

interface RecipeCardProps {
  recipe: RecipeWithIngredients
  onClick: () => void
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <Card
      className="flex cursor-pointer gap-3 p-3 transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      {/* サムネイル画像 */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground">
            🍳
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate font-semibold leading-tight">{recipe.title}</h3>
        {recipe.source_name && (
          <p className="truncate text-sm text-muted-foreground">{recipe.source_name}</p>
        )}
        {recipe.mainIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.mainIngredients.slice(0, 3).map((ing) => (
              <Badge key={ing.id} variant="outline" className="text-xs">
                {ing.name}
              </Badge>
            ))}
            {recipe.mainIngredients.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{recipe.mainIngredients.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
