import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'

// .env.local を読み込んでプロセス環境変数にセット（test worker に継承される）
// ファイルが存在しない場合（CI 環境など）は静かにスキップ
// override: false で CI の環境変数（$GITHUB_ENV 経由）を上書きしない
config({ path: '.env.local', override: false, quiet: true })

/**
 * dev サーバーのポート。
 *
 * `reuseExistingServer` はポートが開いてさえいれば**別プロジェクトのサーバーでも黙って再利用する**。
 * 3000 番を他のアプリが使っていると、テストはそのアプリに対して走って 404 で落ちる。
 * ぶつかったら `E2E_PORT=3100 npm run test:e2e` のように逃がす。
 */
const PORT = Number(process.env.E2E_PORT ?? 3000)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',

  // Edge Runtime が死んでいると一覧が黙って空になり、全テストが原因不明に落ちる。
  // テスト前に検出して原因を名指しする（`e2e/global-setup.ts`）。
  globalSetup: './e2e/global-setup.ts',

  // DB 状態を共有するため並列実行は無効
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
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
