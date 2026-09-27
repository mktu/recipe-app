'use client'

import { Badge } from '@/components/ui/badge'
import type { RecipeIngredient } from '@/types/recipe'
import { FALLBACK_IMAGE_PATH } from '@/lib/recipe/placeholder-images'

interface RecipeHeaderProps {
  title: string
  sourceName: string | null
  imageUrl: string | null
  mainIngredients: RecipeIngredient[]
}

export function RecipeHeader({ title, sourceName, imageUrl, mainIngredients }: RecipeHeaderProps) {
  return (
    <div className="space-y-4">
      {/* 画像 */}
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl ?? FALLBACK_IMAGE_PATH} alt={imageUrl ? title : ''} className="h-full w-full object-cover" />
      </div>

      {/* タイトル・ソース名 */}
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {sourceName && <p className="mt-1 text-sm text-muted-foreground">{sourceName}</p>}
      </div>

      {/* メイン食材 */}
      {mainIngredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mainIngredients.map((ing) => (
            <Badge key={ing.id} variant="secondary" className="rounded-full px-3 py-1">
              {ing.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
