import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// `@/` エイリアスを tsconfig と揃える（テストからも解決できるようにする）
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
