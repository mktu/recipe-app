import { isPlaceholderImageKey } from '@/lib/recipe/placeholder-images'
import type { IngredientRaw, RecipeNoteFields } from '@/types/recipe'

export type ParseNoteFieldsResult =
  | { data: RecipeNoteFields; error: null }
  | { data: null; error: string }

/**
 * API に届いたノートの編集内容を検証して整える（作成 #175 と更新 #176 で共有する想定）。
 *
 * - 空欄の材料・手順は落とす。フォームで行を足したまま保存するのは普通の操作なのでエラーにしない
 * - `imageKey` は `isPlaceholderImageKey` で検証する。DB の CHECK 制約は文字種しか見ないので、
 *   存在しないキーを通すと一覧・詳細・LINE の画像が静かに 404 になる（#174）
 * - 任意項目の空文字は null に揃える。更新は全項目の置き換えなので、null は「消す」を意味する
 */
export function parseNoteFields(body: unknown): ParseNoteFieldsResult {
  if (!body || typeof body !== 'object') return fail('リクエストが不正です')
  const b = body as Record<string, unknown>

  const title = optionalText(b.title)
  if (!title) return fail('タイトルは必須です')

  const ingredients = parseIngredients(b.ingredients)
  const steps = parseSteps(b.steps)
  if (!ingredients || !steps) return fail('材料または手順の形式が不正です')

  const imageKey = b.imageKey ?? null
  if (!isNullOr(imageKey, isPlaceholderImageKey)) return fail('画像の指定が不正です')

  const cookingTimeMinutes = b.cookingTimeMinutes ?? null
  if (!isNullOr(cookingTimeMinutes, isPositiveInteger)) return fail('調理時間は1以上の整数で指定してください')

  return {
    data: {
      title,
      ingredients,
      steps,
      imageKey,
      servings: optionalText(b.servings),
      memo: optionalText(b.memo),
      cookingTimeMinutes,
    },
    error: null,
  }
}

function fail(error: string): ParseNoteFieldsResult {
  return { data: null, error }
}

function parseIngredients(value: unknown): IngredientRaw[] | null {
  if (!Array.isArray(value)) return null
  const rows: IngredientRaw[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const { name, amount } = item as Record<string, unknown>
    if (typeof name !== 'string' || (amount !== undefined && typeof amount !== 'string')) return null
    if (name.trim()) rows.push({ name: name.trim(), amount: (amount ?? '').trim() })
  }
  return rows
}

function parseSteps(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((s) => typeof s !== 'string')) return null
  return (value as string[]).map((s) => s.trim()).filter(Boolean)
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isNullOr<T>(value: unknown, guard: (v: unknown) => v is T): value is T | null {
  return value === null || guard(value)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}
