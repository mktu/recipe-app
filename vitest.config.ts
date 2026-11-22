import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// `@/` エイリアスを tsconfig と揃える（テストからも解決できるようにする）
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // e2e/ は Playwright の担当。vitest が拾うと @playwright/test の import で落ちる
    // .claude/ は Claude Code の mod（独自ランタイム。`claude plugin test` で回す）と worktree のコピー
    exclude: ['**/node_modules/**', '**/dist/**', '.next/**', 'e2e/**', '.claude/**'],
  },
})
