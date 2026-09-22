import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://localhost:54321'
// SUPABASE_SECRET_KEY は playwright.config.ts が .env.local から読み込んでセット済み
// CI では workflow が supabase status から取得して環境変数に渡す
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY
if (!SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY が未設定です。playwright.config.ts が .env.local を読み込めているか確認してください。')

// DevAuth モードで使われるユーザー（src/lib/auth/constants.ts の DEV_USER と一致）
export const E2E_LINE_USER_ID = 'dev-user-001'

const admin = createClient(SUPABASE_URL, SECRET_KEY)

async function getUserId(): Promise<string> {
  const { data } = await admin
    .from('users')
    .select('id')
    .eq('line_user_id', E2E_LINE_USER_ID)
    .single()

  if (!data) throw new Error('User not found. Call setupUser() first.')
  return data.id as string
}

/**
 * テストユーザーを DB にセットアップする。
 * 既存データを削除してから INSERT することで、テスト間で状態を持ち越さない。
 */
export async function setupUser() {
  await cleanUserData()

  const { error } = await admin
    .from('users')
    .insert({
      line_user_id: E2E_LINE_USER_ID,
      display_name: '開発ユーザー',
    })

  if (error) throw new Error(`setupUser failed: ${error.message}`)
}

/**
 * テストユーザーのデータを全て削除する（テスト後のクリーンアップ）。
 *
 * `recipe_ingredients` と `recipe_notes` は `recipes` / `users` への FK が
 * ON DELETE CASCADE のため個別の DELETE は要らない。
 */
export async function cleanUserData() {
  const { data: user } = await admin
    .from('users')
    .select('id')
    .eq('line_user_id', E2E_LINE_USER_ID)
    .maybeSingle()

  if (!user) return

  await admin.from('recipes').delete().eq('user_id', user.id)
  await admin.from('users').delete().eq('line_user_id', E2E_LINE_USER_ID)
}

export interface SeedRecipeInput {
  url: string
  title: string
  sourceName?: string
  cookingTimeMinutes?: number | null
  ingredientsRaw?: { name: string; amount: string }[]
}

/** テスト用レシピを1件シードする */
export async function seedRecipe(input: SeedRecipeInput) {
  const userId = await getUserId()

  const { data, error } = await admin
    .from('recipes')
    .insert({
      user_id: userId,
      url: input.url,
      title: input.title,
      source_name: input.sourceName ?? 'E2E テスト',
      cooking_time_minutes: input.cookingTimeMinutes ?? null,
      ingredients_raw: input.ingredientsRaw ?? [{ name: '鶏肉', amount: '200g' }],
    })
    .select()
    .single()

  if (error) throw new Error(`seedRecipe failed: ${error.message}`)
  return data
}

/**
 * テスト用レシピをまとめてシードする。ホーム画面・詳細テストで使用。
 */
export async function seedRecipes(count = 3) {
  const userId = await getUserId()

  const recipes = Array.from({ length: count }, (_, i) => ({
    user_id: userId,
    url: `https://delishkitchen.tv/recipes/e2e-test-${i + 1}`,
    title: `テストレシピ ${i + 1}`,
    source_name: 'DELISH KITCHEN',
    cooking_time_minutes: (i + 1) * 10,
    ingredients_raw: [{ name: '鶏肉', amount: '200g' }],
  }))

  const { data } = await admin.from('recipes').insert(recipes).select()
  return data ?? []
}

const RECIPE_COLUMNS = 'id, title, url, source_name, cooking_time_minutes, ingredients_raw, memo'

/** 指定 URL のレシピを取得する（保存結果の検証用） */
export async function findRecipeByUrl(url: string) {
  const userId = await getUserId()

  const { data } = await admin
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('user_id', userId)
    .eq('url', url)
    .maybeSingle()

  return data
}

/**
 * 指定 ID のレシピを取得する（メモ更新・削除の検証用）。
 *
 * 削除されていれば `null` が返る。
 */
export async function findRecipeById(id: string) {
  const userId = await getUserId()

  const { data } = await admin
    .from('recipes')
    .select(RECIPE_COLUMNS)
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()

  return data
}

/**
 * 未マッチ食材の記録を消す。
 *
 * `matchIngredients()` は解析のたびに `unmatched_ingredients` へ行を足すが、
 * このテーブルはユーザーに紐付かない（`recipe_id` は解析時点では null）ため
 * `cleanUserData()` では落ちない。放置するとローカルのアンマッチ解析
 * （`scripts/check-ingredient-match-rate.sh`）にテストの食材が混ざる。
 */
export async function cleanUnmatchedIngredients(rawNames: readonly string[]) {
  await admin.from('unmatched_ingredients').delete().in('raw_name', [...rawNames])
}
