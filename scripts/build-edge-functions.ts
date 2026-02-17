/**
 * Edge Function ビルドスクリプト
 *
 * 共有ロジックをEdge Function用にコピー・変換する
 *
 * 使い方:
 *   npx tsx scripts/build-edge-functions.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'

const FUNCTIONS_DIR = 'supabase/functions'

interface FunctionConfig {
  name: string
  sharedFiles: Array<{
    src: string
    dest: string
  }>
}

const functions: FunctionConfig[] = [
  {
    name: 'auto-alias',
    sharedFiles: [
      {
        src: 'src/lib/batch/alias-generator.ts',
        dest: 'alias-generator.ts',
      },
    ],
  },
]

function transformForDeno(content: string): string {
  // @supabase/supabase-js → npm:@supabase/supabase-js@2
  return content.replace(
    /from ['"]@supabase\/supabase-js['"]/g,
    "from 'npm:@supabase/supabase-js@2'"
  )
}

function buildFunction(config: FunctionConfig): void {
  console.log(`\n📦 Building ${config.name}...`)

  const functionDir = join(FUNCTIONS_DIR, config.name)

  for (const file of config.sharedFiles) {
    const srcPath = file.src
    const destPath = join(functionDir, file.dest)

    if (!existsSync(srcPath)) {
      console.error(`  ❌ Source not found: ${srcPath}`)
      continue
    }

    // ディレクトリ作成
    const destDir = dirname(destPath)
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    // ファイル読み込み・変換・書き込み
    let content = readFileSync(srcPath, 'utf-8')
    content = transformForDeno(content)

    // ヘッダーコメント追加
    const header = `// THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY
// Source: ${file.src}
// Run: npx tsx scripts/build-edge-functions.ts

`
    content = header + content

    writeFileSync(destPath, content)
    console.log(`  ✅ ${file.src} → ${destPath}`)
  }
}

function main(): void {
  console.log('🔧 Building Edge Functions...')

  for (const config of functions) {
    buildFunction(config)
  }

  console.log('\n✨ Done!')
}

main()
