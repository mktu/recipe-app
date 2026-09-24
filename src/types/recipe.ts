import type { Tables } from '@/types/database'

/** ソート順 */
export type SortOrder = 'newest' | 'oldest' | 'most_viewed' | 'recently_viewed' | 'shortest_cooking' | 'fewest_ingredients'

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
  ingredientsRaw?: IngredientRaw[]
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
  ingredientsRaw?: IngredientRaw[]
  memo?: string
  cookingTimeMinutes?: number | null
}

/** 材料（分量付き） */
export interface IngredientRaw {
  name: string
  amount: string
}

/** レシピ更新入力 */
export interface UpdateRecipeInput {
  ingredientIds?: string[]
  ingredientsRaw?: IngredientRaw[]
  memo?: string
  title?: string
  sourceName?: string
  imageUrl?: string
  cookingTimeMinutes?: number | null
}

/** レシピ詳細（詳細画面用） */
export interface RecipeDetail extends RecipeWithIngredients {
  ingredientsRaw: IngredientRaw[]
  /**
   * 対になるレシピノートの ID。外部サイトのブックマークなら null。
   * 「ノートかどうか」は `url` を見ずにこれで判定する（Epic #172 の論点 B）。
   */
  noteId: string | null
}

/** マッチしなかった食材1件分（unmatched_ingredients への記録用） */
export interface UnmatchedIngredient {
  rawName: string        // 分割前の元エントリ名
  normalizedName: string // 正規化後の名前
}

/** レシピノート作成入力 */
export interface CreateRecipeNoteInput {
  lineUserId: string
  title: string
  ingredients: IngredientRaw[]
  steps: string[]
  ingredientIds: string[]
  unmatchedIngredients?: UnmatchedIngredient[]
  imageKey?: string
  servings?: string
  memo?: string
  cookingTimeMinutes?: number | null
}

/**
 * レシピノート（閲覧・編集画面用）
 *
 * メモ・調理時間・表示用の画像 URL は `recipes` 側にしか無いので、対のレシピ行から引く。
 * `recipeId` が null のノート（将来のアレンジ用。Epic #172）ではこれらも null になる。
 */
export interface RecipeNoteDetail {
  id: string
  recipeId: string | null
  title: string
  ingredients: IngredientRaw[]
  steps: string[]
  imageKey: string | null
  imageUrl: string | null
  servings: string | null
  memo: string | null
  cookingTimeMinutes: number | null
}

/** ノートの編集内容（API の入力）。材料の食材 ID はサーバー側で解決するので持たない */
export type RecipeNoteFields = Pick<
  UpdateRecipeNoteInput,
  'title' | 'ingredients' | 'steps' | 'imageKey' | 'servings' | 'memo' | 'cookingTimeMinutes'
>

/**
 * レシピノート更新入力
 *
 * 更新は**全項目の置き換え**（PUT セマンティクス）。`update_recipe_note` の任意引数は
 * 渡さないと既定値の NULL で上書きされるため、「渡し忘れ」と「明示的に空にする」を
 * 型で区別できるよう、作成時は任意の項目もここでは必須にしている。
 * 値を消したいときは `null` を渡す。
 */
export interface UpdateRecipeNoteInput
  extends Omit<CreateRecipeNoteInput, 'imageKey' | 'servings' | 'memo' | 'cookingTimeMinutes'> {
  noteId: string
  imageKey: string | null
  servings: string | null
  memo: string | null
  cookingTimeMinutes: number | null
}
