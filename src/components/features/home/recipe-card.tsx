'use client'

import Link from 'next/link'
import { Clock, Utensils } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { RecipeWithIngredients } from '@/types/recipe'

interface RecipeCardProps {
  recipe: RecipeWithIngredients
  /** 閲覧記録のフック。遷移そのものは `<Link>` が行う */
  onOpen: () => void
}

const badgeClass = 'rounded-full px-2.5 py-0.5 text-xs font-normal'

function RecipeMeta({ cookingTime, ingredientCount }: { cookingTime: number | null; ingredientCount: number | null }) {
  if (!cookingTime && !ingredientCount) return null
  return (
    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
      {cookingTime && (
        <span className="flex items-center gap-0.5">
          <Clock className="h-3 w-3" />
          {cookingTime}分
        </span>
      )}
      {ingredientCount && (
        <span className="flex items-center gap-0.5">
          <Utensils className="h-3 w-3" />
          {ingredientCount}品
        </span>
      )}
    </div>
  )
}

function RecipeThumbnail({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  return (
    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-3xl">🍳</div>
      )}
    </div>
  )
}

/**
 * レシピ1件のカード。
 *
 * カード全体が詳細ページへの `<Link>`。以前は `onClick` 付きの `div` だったため
 * キーボードから到達できず、`getByRole` でも取れなかった（#38）。
 * やることが「詳細ページへ移動する」である以上、`role` や `tabIndex` を手で足すより
 * アンカーにするほうが、キーボード操作・新規タブ・URL コピーがまとめて効く。
 */
export function RecipeCard({ recipe, onOpen }: RecipeCardProps) {
  const displayIngredients = recipe.mainIngredients.slice(0, 3)
  const extraCount = recipe.mainIngredients.length - 3
  const ingredientCount = Array.isArray(recipe.ingredients_raw) ? recipe.ingredients_raw.length : null

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      onClick={onOpen}
      // 一覧は件数が伸びるので、ビューポート内の全カードを先読みさせない
      prefetch={false}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="p-4 transition-colors hover:bg-muted/50">
        <div className="flex gap-4">
          <RecipeThumbnail imageUrl={recipe.image_url} title={recipe.title} />
          <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
            <div>
              <h3 className="font-semibold leading-tight">{recipe.title}</h3>
              {recipe.source_name && (
                <p className="mt-1 text-sm text-muted-foreground">{recipe.source_name}</p>
              )}
              <RecipeMeta cookingTime={recipe.cooking_time_minutes} ingredientCount={ingredientCount} />
            </div>
            {displayIngredients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 overflow-hidden">
                {displayIngredients.map((ing) => (
                  <Badge key={ing.id} variant="secondary" className={badgeClass}>
                    <span className="max-w-20 truncate">{ing.name}</span>
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
    </Link>
  )
}
