import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// .env.local を読み込んでプロセス環境変数にセット（test worker に継承される）
// ファイルが存在しない場合（CI 環境など）は静かにスキップ
// override: false で CI の環境変数（$GITHUB_ENV 経由）を上書きしない
config({ path: '.env.local', override: false, quiet: true })

export default defineConfig({
  testDir: './e2e',

  // DB 状態を共有するため並列実行は無効
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // DevAuth モード（LIFF を使わない）
      NEXT_PUBLIC_LIFF_ID: '',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? '',
      // 外部サービスはテスト内で page.route() によりモック
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? 'dummy-for-e2e',
      LINE_CHANNEL_SECRET: 'dummy-for-e2e',
      LINE_CHANNEL_ACCESS_TOKEN: 'dummy-for-e2e',
    },
  },
})
