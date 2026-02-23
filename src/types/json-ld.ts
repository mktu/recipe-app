/**
 * JSON-LD (schema.org) 型定義
 * @see https://schema.org/Recipe
 */

// schema-dtsからRecipe型をre-export
export type { Recipe as SchemaOrgRecipe } from 'schema-dts'

/**
 * JSON-LDから抽出したレシピデータ
 */
export interface JsonLdExtraction {
  title: string
  sourceName: string
  imageUrl: string
  ingredients: string[] // recipeIngredientから抽出した食材名
  cookingTimeMinutes?: number | null
}
