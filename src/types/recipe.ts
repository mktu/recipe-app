import type { Tables } from '@/types/database'

/** ソート順 */
export type SortOrder = 'newest' | 'oldest' | 'most_viewed' | 'recently_viewed'

/** 食材 */
export interface Ingredient {
  id: string
  name: string
  category: string
}

/** 食材情報（レシピに紐づく） */
export interface RecipeIngredient {
  id: string
  name: string
  isMain: boolean
}

/** 食材付きレシピ */
export interface RecipeWithIngredients extends Tables<'recipes'> {
  mainIngredients: RecipeIngredient[]
}

/** カテゴリ別食材 */
export interface IngredientsByCategory {
  category: string
  ingredients: Tables<'ingredients'>[]
}

/** レシピフィルター状態 */
export interface RecipeFilters {
  searchQuery: string
  ingredientIds: string[]
  sortOrder: SortOrder
}

/** AI解析結果 */
export interface ParsedRecipe {
  title: string
  sourceName: string
  imageUrl: string
  ingredientIds: string[]
  memo: string
  cookingTimeMinutes?: number | null
}

/** レシピ作成入力 */
export interface CreateRecipeInput {
  lineUserId: string
  url: string
  title: string
  sourceName?: string
  imageUrl?: string
  ingredientIds: string[]
  memo?: string
  cookingTimeMinutes?: number | null
}

/** 材料（分量付き） */
export interface IngredientRaw {
  name: string
  amount: string
}

/** レシピ詳細（詳細画面用） */
export interface RecipeDetail extends RecipeWithIngredients {
  ingredientsRaw: IngredientRaw[]
}
