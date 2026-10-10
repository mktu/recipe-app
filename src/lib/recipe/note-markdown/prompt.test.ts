import { describe, it, expect } from 'vitest'
import { parseRecipeMarkdown } from './parse-recipe-markdown'
import { RECIPE_INPUT_END_MARKER, RECIPE_INPUT_PREFIX, toLines } from './prefix'
import { RECIPE_NOTE_PROMPT, RECIPE_PROMPT_EXAMPLE } from './prompt'

/** LINE の Bot の返信テキストの上限（#201 で文面をそのまま返す） */
const LINE_TEXT_LIMIT = 5000

/** 文面どおりに出した AI の出力。前置き・締めの言葉が漏れても通ることも兼ねる */
const AI_OUTPUT = `はい、まとめました！\n\`\`\`markdown\n${RECIPE_PROMPT_EXAMPLE}\n\`\`\`\nぜひ作ってみてください。`

describe('AI 用プロンプト: パーサとの往復', () => {
  it('出力例は警告なしで登録できる', () => {
    const result = parseRecipeMarkdown(RECIPE_PROMPT_EXAMPLE)
    expect(result.registrable).toBe(true)
    expect(result.warnings).toEqual([])
    expect(result.fields).toMatchObject({
      title: '鶏むね肉のレモン蒸し',
      servings: '2人分',
      cookingTimeMinutes: 20,
      memo: '冷蔵で2日もつ',
    })
    expect(result.fields.ingredients).toContainEqual({ name: '醤油', amount: '大さじ1（たれ）' })
    expect(result.fields.steps).toHaveLength(3)
  })

  it('文面に載っている出力例がそのまま読める（文面のルールの行は本文に混ざらない）', () => {
    expect(parseRecipeMarkdown(RECIPE_NOTE_PROMPT)).toEqual(parseRecipeMarkdown(RECIPE_PROMPT_EXAMPLE))
  })

  it('コードブロックで包まれ、前後に言葉が付いても同じ結果になる', () => {
    expect(parseRecipeMarkdown(AI_OUTPUT)).toEqual(parseRecipeMarkdown(RECIPE_PROMPT_EXAMPLE))
  })
})

describe('AI 用プロンプト: 文面', () => {
  it('出力例の1行目が接頭語、最終行が終端マーカーになっている', () => {
    const lines = toLines(RECIPE_PROMPT_EXAMPLE)
    expect(lines[0]).toBe(RECIPE_INPUT_PREFIX)
    expect(lines.at(-1)).toBe(RECIPE_INPUT_END_MARKER)
  })

  it('ルールで接頭語と終端マーカーを定数どおりの表記で指示している', () => {
    expect(RECIPE_NOTE_PROMPT).toContain(`1行目は「${RECIPE_INPUT_PREFIX}」`)
    expect(RECIPE_NOTE_PROMPT).toContain(`最後の行は「${RECIPE_INPUT_END_MARKER}」`)
  })

  it('LINE の1通に収まる', () => {
    expect(RECIPE_NOTE_PROMPT.length).toBeLessThanOrEqual(LINE_TEXT_LIMIT)
  })
})
