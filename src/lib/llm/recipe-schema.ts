import { z } from 'zod'

export const recipeExtractionSchema = z.object({
  title: z.string().describe('レシピのタイトル'),
  sourceName: z
    .string()
    .describe('元サイト名（例: クックパッド、デリッシュキッチン）'),
  imageUrl: z
    .string()
    .describe('メイン画像の絶対URL（見つからない場合は空文字）'),
  mainIngredients: z
    .array(z.string())
    .max(5)
    .describe('メイン食材（調味料を除く、最大5つ）'),
  cookingTimeMinutes: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('調理時間（分）。不明の場合は null'),
})

export type RecipeExtraction = z.infer<typeof recipeExtractionSchema>
