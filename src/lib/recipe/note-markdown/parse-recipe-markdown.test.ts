import { describe, it, expect } from 'vitest'
import { parseRecipeMarkdown } from './parse-recipe-markdown'

/** Issue #177 の想定フォーマット */
const BASIC = `# 鶏むね肉のレモン蒸し

## 材料（2人分）
- 鶏むね肉 300g
- レモン 1/2個
- 酒 大さじ2

## 手順
1. 鶏むね肉をそぎ切りにして塩をふる
2. 耐熱皿に並べ、レモンと酒をかける
3. ラップをして600Wで6分加熱する

## メモ
冷蔵で2日。調理時間20分`

const EXPECTED_INGREDIENTS = [
  { name: '鶏むね肉', amount: '300g' },
  { name: 'レモン', amount: '1/2個' },
  { name: '酒', amount: '大さじ2' },
]
const EXPECTED_STEPS = [
  '鶏むね肉をそぎ切りにして塩をふる',
  '耐熱皿に並べ、レモンと酒をかける',
  'ラップをして600Wで6分加熱する',
]

describe('parseRecipeMarkdown: 想定フォーマット', () => {
  it('タイトル・材料・手順・人数・メモ・調理時間が取れる', () => {
    const result = parseRecipeMarkdown(BASIC)
    expect(result.fields).toEqual({
      title: '鶏むね肉のレモン蒸し',
      ingredients: EXPECTED_INGREDIENTS,
      steps: EXPECTED_STEPS,
      imageKey: null,
      servings: '2人分',
      memo: '冷蔵で2日。調理時間20分',
      cookingTimeMinutes: 20,
    })
    expect(result.warnings).toEqual([])
    expect(result.registrable).toBe(true)
    expect(result.blockingReasons).toEqual([])
  })

  it('接頭語の有無どちらでも同じ結果になる（LINE #208 と Web #178 の両方から来る）', () => {
    const withPrefix = parseRecipeMarkdown(`[レシピ入力]\n${BASIC}`)
    expect(withPrefix).toEqual(parseRecipeMarkdown(BASIC))
  })

  it('タイトル直下のメタ行から調理時間と人数を取る', () => {
    const md = '# 冷奴\n調理時間: 5分\n人数: 1人分\n\n## 材料\n- 豆腐 1丁\n\n## 手順\n1. 切る'
    const { fields } = parseRecipeMarkdown(md)
    expect(fields.cookingTimeMinutes).toBe(5)
    expect(fields.servings).toBe('1人分')
    expect(fields.memo).toBeNull()
  })
})

describe('parseRecipeMarkdown: 見出しのゆらぎ', () => {
  it.each([
    ['材料リスト', '作り方'],
    ['Ingredients', 'Steps'],
    ['食材', 'つくり方'],
  ])('「%s」「%s」を認める', (ingredients, steps) => {
    const md = `# a\n## ${ingredients}\n- 塩 少々\n## ${steps}\n1. ふる`
    const { fields } = parseRecipeMarkdown(md)
    expect(fields.ingredients).toEqual([{ name: '塩', amount: '少々' }])
    expect(fields.steps).toEqual(['ふる'])
  })

  it('太字・隅付き括弧・### の見出しを認める', () => {
    const md = '# a\n**材料（2人分）**\n- 塩 少々\n【作り方】\n1. ふる\n### ポイント\n振りすぎない'
    const { fields } = parseRecipeMarkdown(md)
    expect(fields.servings).toBe('2人分')
    expect(fields.steps).toEqual(['ふる'])
    expect(fields.memo).toBe('振りすぎない')
  })

  it('「ポイント」「コツ」はメモに入れる', () => {
    const md = `${BASIC}\n\n## コツ\n- 加熱しすぎない`
    expect(parseRecipeMarkdown(md).fields.memo).toBe('冷蔵で2日。調理時間20分\n\n・加熱しすぎない')
  })

  it('メモの中の「ポイント 〜」という地の文を見出しと取り違えない', () => {
    const md = `${BASIC}\nポイント 火を通しすぎない`
    expect(parseRecipeMarkdown(md).fields.memo).toBe('冷蔵で2日。調理時間20分\nポイント 火を通しすぎない')
  })
})

describe('parseRecipeMarkdown: 未知のセクション', () => {
  it('エラーにせず無視して警告する', () => {
    const md = `${BASIC}\n\n## アレンジ: 時短\n- 電子レンジで4分`
    const result = parseRecipeMarkdown(md)
    expect(result.fields.memo).toBe('冷蔵で2日。調理時間20分')
    expect(result.warnings).toEqual([{ message: '「アレンジ: 時短」の内容は読み込んでいません' }])
    expect(result.registrable).toBe(true)
  })

  it('未知のセクションの下の ### 材料 を本体の材料に混ぜない', () => {
    const md = `${BASIC}\n\n## アレンジ: ピーマン版\n### 材料\n- ピーマン 2個\n### 手順\n1. 炒める`
    const { fields } = parseRecipeMarkdown(md)
    expect(fields.ingredients).toEqual(EXPECTED_INGREDIENTS)
    expect(fields.steps).toEqual(EXPECTED_STEPS)
  })
})
