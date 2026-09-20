import { test, expect, type Page } from '@playwright/test'
import {
  cleanUnmatchedIngredients,
  cleanUserData,
  findRecipeByUrl,
  seedRecipe,
  setupUser,
} from './fixtures/db'
import { FIXTURE_RECIPE, startRecipeSite, type RecipeSite } from './fixtures/recipe-site'

/**
 * レシピ追加フローの E2E（Issue #37）。
 *
 * Epic #172（レシピノート）が `parseRecipe()` の入口とこのフローの UI に分岐を足すため、
 * 変更が入る前のベースラインとして置いている。
 *
 * 解析対象のサイトはローカルの fixture サーバー（`fixtures/recipe-site.ts`）。
 * 確認画面の `parseRecipe()` はサーバー側で走るので `page.route()` では差し替えられない。
 */

let site: RecipeSite

test.beforeAll(async () => {
  site = await startRecipeSite()
})

test.afterAll(async () => {
  await site.close()
  // `dev-user-001` の users 行はローカル開発（seed.sql）でも使われる。
  // 消したままにすると `npm run dev` でレシピを追加できなくなるので戻しておく
  // （`docs/SUPABASE_LOCAL.md` 「レシピ追加には dev-user-001 の users 行が必要」）。
  await setupUser()
})

test.beforeEach(async () => {
  await setupUser()
})

test.afterEach(async () => {
  await cleanUserData()
  await cleanUnmatchedIngredients(FIXTURE_RECIPE.ingredientLines)
})

/** URL 入力画面で URL を送信し、確認画面まで進む */
async function submitUrl(page: Page, url: string) {
  await page.goto('/recipes/add')
  await expect(page.getByRole('heading', { name: 'レシピを追加' })).toBeVisible()
  await page.getByLabel('レシピのURL').fill(url)
  await page.getByRole('button', { name: '次へ' }).click()
}

test('URL 入力から保存までを通し、ホームの一覧に反映される', async ({ page }) => {
  await submitUrl(page, site.recipeUrl)

  // --- 確認画面: パース結果が入っている ---
  await expect(page.getByRole('heading', { name: 'レシピを編集' })).toBeVisible()
  await expect(page.getByLabel('タイトル')).toHaveValue(FIXTURE_RECIPE.title)
  await expect(page.getByLabel('出典')).toHaveValue(FIXTURE_RECIPE.sourceName)
  await expect(page.getByLabel('画像URL')).toHaveValue(FIXTURE_RECIPE.imageUrl)

  // JSON-LD の食材が食材マスタに解決され、選択済みバッジとして出ている
  for (const name of FIXTURE_RECIPE.matchedIngredientNames) {
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  }

  // --- 食材を1つ追加する ---
  await page.getByRole('button', { name: '追加' }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  // この検索欄は可視ラベルを持たず placeholder がそのままアクセシブル名なので、
  // getByPlaceholder で取るのが正しい（ラベルがあるのに紐付いていない、という状態ではない）
  await sheet.getByPlaceholder('食材を検索...').fill('にんじん')
  await sheet.getByText('にんじん', { exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(sheet).not.toBeVisible()
  await expect(page.getByText('にんじん', { exact: true })).toBeVisible()

  // --- 保存するとホームへ戻り、一覧に出る ---
  await page.getByRole('button', { name: '保存する' }).click()
  await page.waitForURL('/')
  await expect(page.getByRole('heading', { name: FIXTURE_RECIPE.title })).toBeVisible()

  // 保存内容が DB に入っている（一覧は Edge Function 経由なので DB 側も確認する）
  const saved = await findRecipeByUrl(site.recipeUrl)
  expect(saved?.title).toBe(FIXTURE_RECIPE.title)
  expect(saved?.source_name).toBe(FIXTURE_RECIPE.sourceName)
  expect(saved?.cooking_time_minutes).toBe(FIXTURE_RECIPE.cookingTimeMinutes)
})

test('不正な URL は確認画面へ進まない', async ({ page }) => {
  await page.goto('/recipes/add')
  const input = page.getByLabel('レシピのURL')
  await input.fill('not-a-url')
  await page.getByRole('button', { name: '次へ' }).click()

  // 入力欄が `<input type="url">` なので、submit はブラウザのネイティブ検証で止まる。
  // つまり UrlInputForm の `有効なURLを入力してください` には到達せず、
  // ユーザーが見るのはブラウザ標準のツールチップ（文言はブラウザの言語設定依存）。
  // 空欄のときだけアプリ自身のメッセージが出る、という非対称がある（下のテスト）。
  expect(await input.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false)
  await expect(page.getByText('有効なURLを入力してください')).toHaveCount(0)
  await expect(page).toHaveURL(/\/recipes\/add$/)
})

test('空の URL はエラーになり、確認画面へ進まない', async ({ page }) => {
  await page.goto('/recipes/add')
  await page.getByRole('button', { name: '次へ' }).click()

  await expect(page.getByText('URLを入力してください', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/recipes\/add$/)
})

test('登録済みの URL は重複エラーになり、確認画面に留まる', async ({ page }) => {
  await seedRecipe({ url: site.recipeUrl, title: '先に登録済みのレシピ' })

  await submitUrl(page, site.recipeUrl)
  await expect(page.getByRole('heading', { name: 'レシピを編集' })).toBeVisible()
  await page.getByRole('button', { name: '保存する' }).click()

  await expect(page.getByText('このURLは既に登録済みです')).toBeVisible()
  await expect(page).toHaveURL(/\/recipes\/add\/confirm/)

  // 既存のレシピが上書きされていない
  const existing = await findRecipeByUrl(site.recipeUrl)
  expect(existing?.title).toBe('先に登録済みのレシピ')
})
