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
  sourceName?: string | null
  cookingTimeMinutes?: number | null
  ingredientsRaw?: { name: string; amount: string }[]
  /** ソート（よく見た順）の検証用 */
  viewCount?: number
  /** ソート（最近見た順）の検証用。ISO 文字列 */
  lastViewedAt?: string | null
  /** ソート（新しい順 / 古い順）の検証用。同時 INSERT だと差が付かないので明示する */
  createdAt?: string
  /**
   * 食材マスタ（`ingredients`）の名前。`recipe_ingredients` に `is_main` で紐付ける。
   *
   * 食材フィルターは ID 一致でしか絞らない（テキスト照合に回らない）ので、
   * `ingredients_raw` に名前を書くだけでは引っかからない。
   */
  mainIngredientNames?: string[]
}

/**
 * 食材マスタの ID を名前で引く。
 *
 * **ID をテストに直書きしてはいけない。** `ingredients.id` は `gen_random_uuid()` なので
 * ローカルと CI（毎回クリーンな `supabase start`）で値が違う。
 */
export async function findIngredientIdByName(name: string): Promise<string> {
  const { data } = await admin
    .from('ingredients')
    .select('id')
    .eq('name', name)
    .eq('needs_review', false)
    .maybeSingle()

  if (!data) throw new Error(`食材マスタに「${name}」がありません（supabase/migrations の seed を確認）`)
  return data.id as string
}

async function linkMainIngredients(recipeId: string, names: string[]) {
  const rows = await Promise.all(
    names.map(async (name) => ({
      recipe_id: recipeId,
      ingredient_id: await findIngredientIdByName(name),
      is_main: true,
    }))
  )

  const { error } = await admin.from('recipe_ingredients').insert(rows)
  if (error) throw new Error(`linkMainIngredients failed: ${error.message}`)
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
      source_name: input.sourceName === undefined ? 'E2E テスト' : input.sourceName,
      cooking_time_minutes: input.cookingTimeMinutes ?? null,
      ingredients_raw: input.ingredientsRaw ?? [{ name: '鶏肉', amount: '200g' }],
      view_count: input.viewCount ?? 0,
      last_viewed_at: input.lastViewedAt ?? null,
      ...(input.createdAt ? { created_at: input.createdAt } : {}),
    })
    .select()
    .single()

  if (error) throw new Error(`seedRecipe failed: ${error.message}`)

  if (input.mainIngredientNames?.length) {
    await linkMainIngredients(data.id as string, input.mainIngredientNames)
  }

  return data
}

/**
 * テスト用レシピをまとめてシードする（指定順に1件ずつ）。
 *
 * `recipe_ingredients` の紐付けが要るので bulk insert にはしていない。
 */
export async function seedRecipes(inputs: SeedRecipeInput[]) {
  const seeded = []
  for (const input of inputs) {
    seeded.push(await seedRecipe(input))
  }
  return seeded
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
