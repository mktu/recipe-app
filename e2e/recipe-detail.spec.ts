import { test, expect, type Page } from '@playwright/test'
import { cleanUserData, findRecipeById, seedRecipe, setupUser } from './fixtures/db'

/**
 * レシピ詳細画面の E2E（Issue #39）。
 *
 * 追加フロー（#37）と違い解析は挟まないので、レシピは `seedRecipe()` で直接 DB に入れる。
 * 詳細は `/api/recipes/[id]`（Next.js の API Route）、ホーム一覧は `get-recipes`
 * Edge Function 経由なので、削除の反映確認には `supabase start` が要る。
 *
 * ロケーターは `getByLabel` / `getByRole` を優先する（#37 のコメント参照）。
 * `getByRole` の `name` は既定で部分一致なので、他のボタンと前方一致する
 * 「保存」などは `exact: true` を付けている。
 */

const RECIPE = {
  url: 'https://delishkitchen.tv/recipes/e2e-detail-1',
  title: 'E2E 詳細テスト用レシピ',
  sourceName: 'DELISH KITCHEN',
  cookingTimeMinutes: 25,
  ingredientsRaw: [
    { name: '鶏もも肉', amount: '300g' },
    { name: '長ねぎ', amount: '1本' },
  ],
} as const

test.beforeEach(async () => {
  await setupUser()
})

test.afterEach(async () => {
  await cleanUserData()
})

test.afterAll(async () => {
  // `dev-user-001` の users 行はローカル開発（seed.sql）でも使われるので戻しておく
  // （`docs/SUPABASE_LOCAL.md` 「レシピ追加には dev-user-001 の users 行が必要」）。
  await setupUser()
})

/** ホームからカードをクリックして詳細へ遷移する */
async function openDetailFromHome(page: Page, title: string) {
  await page.goto('/')
  // カードは Card（div）に onClick が付いた作りなので、カード内の見出しを押して
  // クリックを伝播させる。見出し自体は h3 なのでロールで取れる。
  await page.getByRole('heading', { name: title }).click()
  await page.waitForURL(/\/recipes\/[0-9a-f-]+$/)
}

test('ホームのカードから詳細へ遷移し、タイトルと材料が表示される', async ({ page }) => {
  const seeded = await seedRecipe({ ...RECIPE, ingredientsRaw: [...RECIPE.ingredientsRaw] })

  await openDetailFromHome(page, RECIPE.title)
  await expect(page).toHaveURL(new RegExp(`/recipes/${seeded.id}$`))

  // タイトル（h1）と出典
  await expect(page.getByRole('heading', { name: RECIPE.title, level: 1 })).toBeVisible()
  await expect(page.getByText(RECIPE.sourceName, { exact: true })).toBeVisible()

  // 材料は ingredients_raw がそのまま名前・分量で並ぶ
  for (const ing of RECIPE.ingredientsRaw) {
    await expect(page.getByText(ing.name, { exact: true })).toBeVisible()
    await expect(page.getByText(ing.amount, { exact: true })).toBeVisible()
  }
})

test('メモを保存すると DB に反映され、再読み込み後も残る', async ({ page }) => {
  const seeded = await seedRecipe({ ...RECIPE, ingredientsRaw: [...RECIPE.ingredientsRaw] })
  const memo = '次は醤油を少なめにする'

  await page.goto(`/recipes/${seeded.id}`)

  // メモ未入力のときはプレースホルダー文言が出ている
  const memoButton = page.getByRole('button', { name: 'メモを編集' })
  await expect(memoButton).toBeVisible()
  await expect(page.getByText('タップしてメモを追加...')).toBeVisible()

  await memoButton.click()
  await page.getByLabel('メモ', { exact: true }).fill(memo)
  await page.getByRole('button', { name: '保存', exact: true }).click()

  // 編集モードが閉じて表示に戻る
  await expect(page.getByLabel('メモ', { exact: true })).toBeHidden()
  await expect(page.getByText(memo)).toBeVisible()

  // DB に入っている（画面の表示はローカル state でも成立してしまうため）
  await expect
    .poll(async () => (await findRecipeById(seeded.id))?.memo)
    .toBe(memo)

  // 再読み込みしても保持されている（= API から取り直しても残る）
  await page.reload()
  await expect(page.getByText(memo)).toBeVisible()
})

test('削除すると確認ダイアログを経てホームの一覧から消える', async ({ page }) => {
  const target = await seedRecipe({ ...RECIPE, ingredientsRaw: [...RECIPE.ingredientsRaw] })
  await seedRecipe({
    url: 'https://delishkitchen.tv/recipes/e2e-detail-2',
    title: '残るほうのレシピ',
  })

  await openDetailFromHome(page, RECIPE.title)

  await page.getByRole('button', { name: 'レシピを削除' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('この操作は取り消せません。レシピは完全に削除されます。')).toBeVisible()
  await dialog.getByRole('button', { name: '削除する' }).click()

  // ホームへ戻り、一覧から消えている（一覧は get-recipes Edge Function 経由）
  await page.waitForURL('/')
  await expect(page.getByRole('heading', { name: RECIPE.title })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '残るほうのレシピ' })).toBeVisible()

  // DB からも消えている
  expect(await findRecipeById(target.id)).toBeNull()
})

test('削除ダイアログでキャンセルするとレシピは残る', async ({ page }) => {
  const target = await seedRecipe({ ...RECIPE, ingredientsRaw: [...RECIPE.ingredientsRaw] })

  await page.goto(`/recipes/${target.id}`)
  await page.getByRole('button', { name: 'レシピを削除' }).click()

  const dialog = page.getByRole('alertdialog')
  await dialog.getByRole('button', { name: 'キャンセル' }).click()

  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`/recipes/${target.id}$`))
  expect((await findRecipeById(target.id))?.title).toBe(RECIPE.title)
})
