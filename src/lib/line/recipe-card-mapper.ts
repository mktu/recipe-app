import type { RecipeCardData } from './flex-message'
import type { SearchRecipeResult } from './search-recipes'

/** SearchRecipeResult → RecipeCardData 変換（LINE Flex Message 用） */
export const toCard = (r: SearchRecipeResult): RecipeCardData => ({
  title: r.title,
  url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/track/recipe/${r.id}`,
  imageUrl: r.imageUrl,
  sourceName: r.sourceName,
  cookingTimeMinutes: r.cookingTimeMinutes,
  ingredientCount: r.ingredientCount,
})
