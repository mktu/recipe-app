import { test, expect } from '@playwright/test'
import { setupUser, cleanUserData, seedRecipes } from './fixtures/db'

test.describe('OnboardingGuard', () => {
  test.afterEach(async () => {
    await cleanUserData()
  })

  test('新規ユーザーが / にアクセスすると /onboarding にリダイレクトされる', async ({ page }) => {
    await setupUser({ onboardingCompleted: false })

    await page.goto('/')
    await page.waitForURL('**/onboarding')

    expect(page.url()).toContain('/onboarding')
  })

  test('オンボーディング完了済みユーザーは / にアクセスしてもリダイレクトされない', async ({ page }) => {
    await setupUser({ onboardingCompleted: true })
    await seedRecipes()

    await page.goto('/')
    // OnboardingGuard が /api/auth/onboarding-status を呼んで完了を確認するまで待機
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL('/')
  })

  test('/onboarding は未完了ユーザーでもリダイレクトせず表示される', async ({ page }) => {
    await setupUser({ onboardingCompleted: false })

    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')

    // /onboarding にいるままであること（無限リダイレクトにならない）
    await expect(page).toHaveURL('/onboarding')
  })
})
