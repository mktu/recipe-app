/**
 * AI 用プロンプトの手確認用スクリプト（#214）
 *
 * 使い方:
 *   npm run try:note-prompt -- --prompt | pbcopy   # 文面をコピーして AI に渡す
 *   pbpaste | npm run try:note-prompt              # AI の出力をコピーしてパース結果を見る
 *
 * LINE（#208）と同じく、パース結果がそのまま登録できるか（registrable）と警告を表示する。
 */

import { parseRecipeMarkdown } from '../src/lib/recipe/note-markdown/parse-recipe-markdown'
import { RECIPE_NOTE_PROMPT } from '../src/lib/recipe/note-markdown/prompt'

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

async function main() {
  if (process.argv.includes('--prompt')) {
    console.log(RECIPE_NOTE_PROMPT)
    return
  }
  const { fields, warnings, registrable, blockingReasons } = parseRecipeMarkdown(await readStdin())
  console.log(registrable ? '✅ 登録できる' : `❌ 登録できない: ${blockingReasons.join(' / ')}`)
  console.log(`⚠️  警告: ${warnings.length}件`)
  for (const w of warnings) console.log(`   - ${w.message}${w.line ? `（${w.line}）` : ''}`)
  console.log(JSON.stringify(fields, null, 2))
}

main()
