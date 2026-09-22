import { test, expect, type Page } from '@playwright/test'
import { cleanUserData, seedRecipes, setupUser, type SeedRecipeInput } from './fixtures/db'

/**
 * ホーム画面の E2E（Issue #38）。一覧・検索・食材フィルター・クリア・ソートを見る。
 *
 * 一覧は `get-recipes` Edge Function 経由なので `supabase functions serve` が要る
 * （`docs/SUPABASE_LOCAL.md`）。起動していなければ `global-setup.ts` が名指しで落とす。
 *
 * ## 検索語の選び方に注意
 *
 * 検索入力は語ごとに「食材条件」か「テキスト条件」かに解決される（`src/lib/search/`）。
 * 食材に解決すると食材ID一致でも引っかかるため、**テキスト検索の検証に食材マスタへ
 * 載っている語を使ってはいけない**。「パスタ」はマスタにあるので使えず、
 * ここでは「ハンバーグ」を使っている。
 *
 * ## 食材 ID は直書きしない
 *
 * `ingredients.id` は `gen_random_uuid()` で、ローカルと CI で値が違う。
 * 紐付けは `mainIngredientNames`（名前 → ID 解決）で行う。
 */

/**
 * ソート6種が**すべて違う並び**になるように値を散らしてある。
 * 同じ並びになるソートがあると、切り替えが効いていなくてもテストが通ってしまう。
 *
 * | ソート | 期待する並び |
 * |---|---|
 * | 新しい順（既定） | グラタン → 照り焼き → ハンバーグ |
 * | 古い順 | ハンバーグ → 照り焼き → グラタン |
 * | よく見た順 | ハンバーグ(5) → グラタン(3) → 照り焼き(1) |
 * | 最近見た順 | 照り焼き(3月) → グラタン(2月) → ハンバーグ(1月) |
 * | 調理時間が短い順 | 照り焼き(10分) → ハンバーグ(20分) → グラタン(30分) |
 * | 材料が少ない順 | グラタン(2品) → ハンバーグ(3品) → 照り焼き(4品) |
 */
const HAMBURG = 'E2E ハンバーグ'
const TERIYAKI = 'E2E 鶏の照り焼き'
const GRATIN = 'E2E ポテトグラタン'

const RECIPES: SeedRecipeInput[] = [
  {
    url: 'https://delishkitchen.tv/recipes/e2e-home-1',
    title: HAMBURG,
    sourceName: 'DELISH KITCHEN',
    cookingTimeMinutes: 20,
    ingredientsRaw: [
      { name: '合いびき肉', amount: '300g' },
      { name: 'たまねぎ', amount: '1個' },
      { name: 'パン粉', amount: '大さじ3' },
    ],
    mainIngredientNames: ['たまねぎ'],
    viewCount: 5,
    lastViewedAt: '2026-01-10T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    url: 'https://www.kurashiru.com/recipes/e2e-home-2',
    title: TERIYAKI,
    sourceName: 'クラシル',
    cookingTimeMinutes: 10,
    ingredientsRaw: [
      { name: '鶏もも肉', amount: '2枚' },
      { name: '醤油', amount: '大さじ2' },
      { name: 'みりん', amount: '大さじ2' },
      { name: '砂糖', amount: '大さじ1' },
    ],
    mainIngredientNames: ['鶏もも肉'],
    viewCount: 1,
    lastViewedAt: '2026-03-10T00:00:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    url: 'https://delishkitchen.tv/recipes/e2e-home-3',
    title: GRATIN,
    sourceName: 'DELISH KITCHEN',
    cookingTimeMinutes: 30,
    ingredientsRaw: [
      { name: 'じゃがいも', amount: '3個' },
      { name: 'チーズ', amount: '50g' },
    ],
    mainIngredientNames: ['じゃがいも'],
    viewCount: 3,
    lastViewedAt: '2026-02-10T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
  },
]

const NEWEST_ORDER = [GRATIN, TERIYAKI, HAMBURG]

test.beforeEach(async ({ page }) => {
  await setupUser()
  await seedRecipes(RECIPES)
  await page.goto('/')
  await expect(listedTitles(page)).toHaveText(NEWEST_ORDER)
})

test.afterEach(async () => {
  await cleanUserData()
})

test.afterAll(async () => {
  // `dev-user-001` の users 行はローカル開発（seed.sql）でも使われるので戻しておく
  // （`docs/SUPABASE_LOCAL.md` 「レシピ追加には dev-user-001 の users 行が必要」）。
  await setupUser()
})

/**
 * 一覧に出ているレシピ名を、表示順のまま取る。
 *
 * カードのタイトルは h3。`main` に閉じ込めているのは、ヘッダーやシート内の
 * 見出しを拾わないため。
 */
function listedTitles(page: Page) {
  return page.getByRole('main').getByRole('heading', { level: 3 })
}

/** 食材フィルターのシートを開き、名前で検索して1件選ぶ */
async function selectIngredient(page: Page, name: string) {
  await page.getByRole('button', { name: '食材で絞り込む' }).click()
  await page.getByPlaceholder('食材を検索...').fill(name)
  await page.getByRole('button', { name, exact: true }).click()
  // シートを閉じないと一覧が見えない。閉じた後もチップはフィルターバーに残る
  await page.keyboard.press('Escape')
  await expect(page.getByPlaceholder('食材を検索...')).toBeHidden()
}

/** ソート順を切り替える（ヘッダーの Select） */
async function selectSortOrder(page: Page, label: string) {
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: label }).click()
}

test('登録済みのレシピが一覧に表示される', async ({ page }) => {
  // タイトル・出典・調理時間・材料数・主要食材が出ている
  const card = page.getByRole('link', { name: HAMBURG })
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('href', /^\/recipes\/[0-9a-f-]+$/)
  await expect(card.getByText('DELISH KITCHEN')).toBeVisible()
  await expect(card.getByText('20分')).toBeVisible()
  await expect(card.getByText('3品')).toBeVisible()
  await expect(card.getByText('たまねぎ', { exact: true })).toBeVisible()
})

test('カードはキーボードだけで開ける', async ({ page }) => {
  // カードは `<Link>`。#38 以前は onClick 付きの div で、ここに到達できなかった。
  const card = page.getByRole('link', { name: GRATIN })
  await card.focus()
  await expect(card).toBeFocused()
  await page.keyboard.press('Enter')

  await page.waitForURL(/\/recipes\/[0-9a-f-]+$/)
  await expect(page.getByRole('heading', { name: GRATIN, level: 1 })).toBeVisible()
})

test('キーワードで検索すると一致するレシピだけが残る', async ({ page }) => {
  await page.getByPlaceholder('レシピを検索...').fill('ハンバーグ')
  await expect(listedTitles(page)).toHaveText([HAMBURG])

  // 出典でも引ける（テキスト条件はタイトル・メモ・サイト名・材料に AND 照合される）
  await page.getByPlaceholder('レシピを検索...').fill('クラシル')
  await expect(listedTitles(page)).toHaveText([TERIYAKI])

  // 検索をクリアすると全件に戻る
  await page.getByRole('button', { name: '検索をクリア' }).click()
  await expect(listedTitles(page)).toHaveText(NEWEST_ORDER)
})

test('食材で絞り込むと対象のレシピだけが残り、チップを外すと戻る', async ({ page }) => {
  await selectIngredient(page, 'じゃがいも')
  await expect(listedTitles(page)).toHaveText([GRATIN])

  // 選択中の食材はフィルターバーにチップとして出る
  const chip = page.getByRole('button', { name: 'じゃがいも を絞り込みから外す' })
  await expect(chip).toBeVisible()

  await chip.click()
  await expect(chip).toBeHidden()
  await expect(listedTitles(page)).toHaveText(NEWEST_ORDER)
})

test('0件になったらクリアボタンで全件表示に戻せる', async ({ page }) => {
  // 検索と食材フィルターを両方かけて0件にする
  await selectIngredient(page, 'じゃがいも')
  await page.getByPlaceholder('レシピを検索...').fill('ハンバーグ')
  await expect(page.getByRole('heading', { name: '該当するレシピがありません' })).toBeVisible()

  await page.getByRole('button', { name: 'フィルターをクリア' }).click()

  // 検索欄も食材チップも空になり、全件に戻る
  await expect(page.getByPlaceholder('レシピを検索...')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'じゃがいも を絞り込みから外す' })).toBeHidden()
  await expect(listedTitles(page)).toHaveText(NEWEST_ORDER)
})

test('ソートを切り替えると一覧の並びが変わる', async ({ page }) => {
  const cases: [label: string, order: string[]][] = [
    ['古い順', [HAMBURG, TERIYAKI, GRATIN]],
    ['よく見た順', [HAMBURG, GRATIN, TERIYAKI]],
    ['最近見た順', [TERIYAKI, GRATIN, HAMBURG]],
    ['調理時間が短い順', [TERIYAKI, HAMBURG, GRATIN]],
    ['材料が少ない順', [GRATIN, HAMBURG, TERIYAKI]],
    ['新しい順', NEWEST_ORDER],
  ]

  for (const [label, order] of cases) {
    await selectSortOrder(page, label)
    await expect(listedTitles(page), `${label} の並び`).toHaveText(order)
  }
})
