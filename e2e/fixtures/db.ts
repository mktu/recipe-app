import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://localhost:54321'
// SUPABASE_SECRET_KEY は playwright.config.ts が .env.local から読み込んでセット済み
// CI では workflow が supabase status から取得して環境変数に渡す
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY
if (!SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY が未設定です。playwright.config.ts が .env.local を読み込めているか確認してください。')

// DevAuth モードで使われるユーザー（src/lib/auth/constants.ts の DEV_USER と一致）
export const E2E_LINE_USER_ID = 'dev-user-001'

const admin = createClient(SUPABASE_URL, SECRET_KEY)

/**
 * テストユーザーを DB にセットアップする。
 * 既存データを削除してから INSERT することで、onboarding_completed_at を確実に制御する。
 */
export async function setupUser({ onboardingCompleted }: { onboardingCompleted: boolean }) {
  await cleanUserData()

  const { error } = await admin
    .from('users')
    .insert({
      line_user_id: E2E_LINE_USER_ID,
      display_name: '開発ユーザー',
      onboarding_completed_at: onboardingCompleted ? new Date().toISOString() : null,
    })

  if (error) throw new Error(`setupUser failed: ${error.message}`)
}

/**
 * テストユーザーのデータを全て削除する（テスト後のクリーンアップ）。
 */
export async function cleanUserData() {
  const { data: user } = await admin
    .from('users')
    .select('id')
    .eq('line_user_id', E2E_LINE_USER_ID)
    .maybeSingle()

  if (!user) return

  await Promise.all([
    admin.from('recipes').delete().eq('user_id', user.id),
    admin.from('onboarding_sessions').delete().eq('user_id', E2E_LINE_USER_ID),
  ])

  await admin.from('users').delete().eq('line_user_id', E2E_LINE_USER_ID)
}

/**
 * テスト用レシピをシードする。ホーム画面・詳細テストで使用。
 */
export async function seedRecipes(count = 3) {
  const { data: user } = await admin
    .from('users')
    .select('id')
    .eq('line_user_id', E2E_LINE_USER_ID)
    .single()

  if (!user) throw new Error('User not found. Call setupUser() first.')

  const recipes = Array.from({ length: count }, (_, i) => ({
    user_id: user.id,
    url: `https://delishkitchen.tv/recipes/e2e-test-${i + 1}`,
    title: `テストレシピ ${i + 1}`,
    source_name: 'DELISH KITCHEN',
    cooking_time_minutes: (i + 1) * 10,
    ingredients_raw: [{ name: '鶏肉', amount: '200g' }],
  }))

  const { data } = await admin.from('recipes').insert(recipes).select()
  return data ?? []
}
