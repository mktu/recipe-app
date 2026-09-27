import type { RecipeCardData } from './flex-message'
import type { SearchRecipeResult } from './search-recipes'
import { toRecipeCardUrl } from './track-redirect'

/** SearchRecipeResult → RecipeCardData 変換（LINE Flex Message 用） */
export const toCard = (r: SearchRecipeResult): RecipeCardData => ({
  title: r.title,
  url: toRecipeCardUrl(r),
  imageUrl: r.imageUrl,
  sourceName: r.sourceName,
  cookingTimeMinutes: r.cookingTimeMinutes,
  ingredientCount: r.ingredientCount,
})
