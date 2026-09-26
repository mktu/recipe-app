/**
 * ローカル開発用のレシピを投入するスクリプト
 *
 * 実装後に「まず自分で動かして確認する」ための土台を1コマンドで作る。
 * 外部サイトへは一切アクセスせず、決め打ちのデータを DB に入れるだけ
 * （実際に解析まで通したい場合は `npm run test:recipe` を使う）。
 *
 * 見た目の確認で詰まりやすいケースを一通り含めてある:
 * 画像なし / 長いタイトル / メモ複数行 / 材料が空 / 出典なし / 食材が多い / レシピノート。
 *
 * 使い方:
 *   npm run seed:dev            # 投入（既にあれば飛ばす）
 *   npm run seed:dev -- --clean # このスクリプトが入れた分だけ削除
 *
 * 注意:
 * - **ローカル専用**。`.env.local` が localhost を指していないと実行を拒否する
 * - E2E をローカルで回すとここで入れたレシピも消える（fixture が
 *   `dev-user-001` のレシピを全削除するため / Issue #190）。消えたら再実行する
 */

import { readFileSync, existsSync } from 'fs'

const ENV_FILE = '.env.local'
const SEED_URL_PREFIX = 'https://dev-seed.local/'
const DEV_LINE_USER_ID = 'dev-user-001'

interface SeedRecipe {
  slug: string
  title: string
  sourceName: string | null
  imageUrl: string | null
  cookingTimeMinutes: number | null
  memo: string | null
  ingredientsRaw: { name: string; amount: string }[]
}

/**
 * 食材名は食材マスタに解決できるものを選んである。
 * 解決できない名前を混ぜると `unmatched_ingredients` に記録が残り、
 * アンマッチ解析（`scripts/check-ingredient-match-rate.sh`）にテストデータが混ざる。
 */
const SEED_RECIPES: SeedRecipe[] = [
  {
    slug: 'teriyaki',
    title: '鶏むね肉の照り焼き',
    sourceName: 'DELISH KITCHEN',
    // ローカルの public 配下を指す。外部画像をホットリンクしないため（#48）
    imageUrl: '/logo.png',
    cookingTimeMinutes: 20,
    memo: null,
    ingredientsRaw: [
      { name: '鶏むね肉', amount: '300g' },
      { name: 'じゃがいも', amount: '2個' },
      { name: 'にんじん', amount: '1本' },
      { name: 'キャベツ', amount: '1/4個' },
      { name: 'トマト', amount: '1個' },
    ],
  },
  {
    slug: 'mapo',
    title: '麻婆豆腐',
    sourceName: 'クラシル',
    imageUrl: null, // 画像なし → 🍳 プレースホルダの確認用
    cookingTimeMinutes: 15,
    memo: 'たれは少し煮詰めた方が絡む。\n次は豆板醤を控えめに。\n\n子ども用は別鍋で。',
    ingredientsRaw: [
      { name: '豆腐', amount: '1丁' },
      { name: 'なす', amount: '2本' },
    ],
  },
  {
    slug: 'long-title',
    title: '休日にまとめて作る、鮭とじゃがいものオーブン焼き（作り置き・お弁当にも使える万能おかず）',
    sourceName: 'みんなのきょうの料理',
    imageUrl: null,
    cookingTimeMinutes: 45,
    memo: null,
    ingredientsRaw: [
      { name: '鮭', amount: '3切れ' },
      { name: 'じゃがいも', amount: '3個' },
    ],
  },
  {
    slug: 'no-ingredients',
    title: '材料が取れなかったレシピ',
    sourceName: null, // 出典なしの確認用
    imageUrl: null,
    cookingTimeMinutes: null,
    memo: null,
    ingredientsRaw: [], // 詳細画面の「材料情報がありません」表示の確認用
  },
]

function loadLocalEnv(): string {
  if (!existsSync(ENV_FILE)) {
    console.error(`エラー: ${ENV_FILE} が見つかりません`)
    process.exit(1)
  }

  for (const line of readFileSync(ENV_FILE, 'utf-8').split('\n')) {
    const match = line.match(/^([^=#]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim()
  }

  // ローカル以外を壊さないための安全弁
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)) {
    console.error(
      `エラー: ローカル専用のスクリプトです（NEXT_PUBLIC_SUPABASE_URL=${url || '未設定'}）`
    )
    process.exit(1)
  }
  return url
}

async function main() {
  // `src/lib/db/client` は読み込み時に環境変数を参照するので、env を入れてから import する
  const supabaseUrl = loadLocalEnv()
  const { createClient } = await import('@supabase/supabase-js')
  const { linkIngredientsForRecipes } = await import('../src/lib/recipe/link-ingredients')
  const { seedDevNotes, cleanDevNotes } = await import('./seed-dev-notes')

  const admin = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY ?? '')

  const { data: user } = await admin
    .from('users')
    .select('id')
    .eq('line_user_id', DEV_LINE_USER_ID)
    .maybeSingle()

  if (!user) {
    console.error(
      `エラー: ${DEV_LINE_USER_ID} の users 行がありません。` +
        '`npx supabase db reset` で seed を再投入してください（docs/SUPABASE_LOCAL.md）'
    )
    process.exit(1)
  }

  if (process.argv.includes('--clean')) {
    const { data } = await admin
      .from('recipes')
      .delete()
      .eq('user_id', user.id)
      .like('url', `${SEED_URL_PREFIX}%`)
      .select('id')

    const notes = await cleanDevNotes(admin, user.id)
    console.log(`🧹 ${data?.length ?? 0} 件、ノート ${notes} 件を削除しました`)
    return
  }

  const { data: existing } = await admin
    .from('recipes')
    .select('url')
    .eq('user_id', user.id)
    .like('url', `${SEED_URL_PREFIX}%`)

  const existingUrls = new Set((existing ?? []).map((r) => r.url))
  const toInsert = SEED_RECIPES.filter((r) => !existingUrls.has(SEED_URL_PREFIX + r.slug))

  await seedDevNotes(admin, user.id, DEV_LINE_USER_ID)

  if (toInsert.length === 0) {
    console.log('✅ レシピはすべて投入済みです')
    return
  }

  const { data: inserted, error } = await admin
    .from('recipes')
    .insert(
      toInsert.map((r) => ({
        user_id: user.id,
        url: SEED_URL_PREFIX + r.slug,
        title: r.title,
        source_name: r.sourceName,
        image_url: r.imageUrl,
        cooking_time_minutes: r.cookingTimeMinutes,
        memo: r.memo,
        ingredients_raw: r.ingredientsRaw,
      }))
    )
    .select('id, url, title')

  if (error) {
    console.error('投入に失敗しました:', error.message)
    process.exit(1)
  }

  // 食材バッジ（recipe_ingredients）まで張らないと、ホームのカードが実物と違って見える
  await linkIngredientsForRecipes(
    (inserted ?? []).map((row) => ({
      id: row.id,
      ingredientsRaw:
        SEED_RECIPES.find((r) => SEED_URL_PREFIX + r.slug === row.url)?.ingredientsRaw ?? [],
    }))
  )

  for (const row of inserted ?? []) {
    console.log(`  ✅ ${row.title}`)
    console.log(`     /recipes/${row.id}`)
  }
  console.log(`\n${inserted?.length ?? 0} 件投入しました`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
