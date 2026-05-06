import { test, expect } from '@playwright/test'
import { setupUser, cleanUserData } from './fixtures/db'
import { MOCK_ONBOARDING_RESULT_PENDING, MOCK_ONBOARDING_RESULT_COMPLETED } from './fixtures/mock-data'

test.describe('オンボーディング フロー', () => {
  test.afterEach(async () => {
    await cleanUserData()
  })

  test('フルフロー: 食材入力 → 送信 → 候補選択 → 登録 → ホームへ', async ({ page }) => {
    await setupUser({ onboardingCompleted: false })

    // Edge Function スクレイピングをモック（実通信しない）
    await page.route('/api/onboarding/start', (route) =>
      route.fulfill({ json: { sessionId: 'e2e-session-001' } })
    )
    // ポーリング: 1回目は pending、2回目以降は completed を返す
    let pollCount = 0
    await page.route('/api/onboarding/result**', (route) => {
      pollCount++
      route.fulfill({
        json: pollCount === 1 ? MOCK_ONBOARDING_RESULT_PENDING : MOCK_ONBOARDING_RESULT_COMPLETED,
      })
    })

    // /onboarding にアクセス → フォームが表示される
    await page.goto('/onboarding')
    await expect(page.getByRole('heading', { name: '好みを教えてください' })).toBeVisible()

    // Drawer を開いて食材を入力（「食材を選ぶ…」ボタンは2つあるので最初のものを使用）
    await page.getByRole('button', { name: '食材を選ぶ…' }).first().click()
    const keywordInput = page.getByPlaceholder('任意の食材を入力')
    await keywordInput.fill('鶏')
    await keywordInput.press('Enter')
    await page.getByRole('button', { name: '完了' }).click()

    // フォーム送信
    await page.getByRole('button', { name: 'レシピを探してもらう' }).click()

    // SubmittedView が表示される
    await expect(page.getByText('バックグラウンドで探しています')).toBeVisible()

    // 結果ページへ遷移
    await page.getByRole('button', { name: '結果を確認する' }).click()
    await page.waitForURL('**/onboarding/result')

    // pending → completed になりレシピ候補が表示される
    await expect(page.getByText('登録するレシピを選んでください')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('鶏の唐揚げ')).toBeVisible()

    // まとめて登録（complete API は実 DB に当てる）
    await page.getByRole('button', { name: /まとめて登録する/ }).click()

    // ホームにリダイレクト
    await page.waitForURL('/')
    await expect(page).toHaveURL('/')
  })

  test('スキップ: 入力せずスキップ → ホームへ', async ({ page }) => {
    await setupUser({ onboardingCompleted: false })

    await page.goto('/onboarding')
    await page.getByRole('button', { name: 'スキップして始める' }).click()

    await page.waitForURL('/')
    await expect(page).toHaveURL('/')
  })
})
