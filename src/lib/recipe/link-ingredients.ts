import { createServerClient } from '@/lib/db/client'
import type { TablesInsert } from '@/types/database'
import { matchIngredientsForRecipes } from './match-ingredients'

interface RecipeToLink {
  id: string
  ingredientsRaw: { name: string; amount: string }[]
}

/**
 * ingredients_linked: false のレシピに対して食材マッチングを実行し、
 * recipe_ingredients を挿入して ingredients_linked を true に更新する。
 *
 * DB クエリは ingredients/aliases の一括フェッチ2回 + レシピ数分の insert/update のみ。
 */
export async function linkIngredientsForRecipes(recipes: RecipeToLink[]): Promise<void> {
  if (recipes.length === 0) return

  const supabase = createServerClient()

  const input = recipes.map((r) => ({
    recipeId: r.id,
    ingredientNames: r.ingredientsRaw.map((i) => i.name),
  }))

  const matchResultMap = await matchIngredientsForRecipes(input)

  for (const recipe of recipes) {
    const matched = matchResultMap.get(recipe.id) ?? []

    if (matched.length > 0) {
      const rows: TablesInsert<'recipe_ingredients'>[] = matched.map((m) => ({
        recipe_id: recipe.id,
        ingredient_id: m.ingredientId,
        is_main: true,
      }))
      const { error: insertError } = await supabase.from('recipe_ingredients').insert(rows)
      if (insertError) {
        console.error(`[linkIngredients] insert error for recipe ${recipe.id}:`, insertError)
      }
    }

    const { error: updateError } = await supabase
      .from('recipes')
      .update({ ingredients_linked: matched.length > 0 })
      .eq('id', recipe.id)
    if (updateError) {
      console.error(`[linkIngredients] update error for recipe ${recipe.id}:`, updateError)
    }
  }
}
