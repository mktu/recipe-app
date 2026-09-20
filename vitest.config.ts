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
    exclude: ['**/node_modules/**', '**/dist/**', '.next/**', 'e2e/**'],
  },
})
