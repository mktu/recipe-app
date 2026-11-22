import { describe, it, expect } from 'vitest'
import { buildIngredientsMessages, buildIngredientsText, NO_INGREDIENTS_TEXT } from './ingredients-messages'

const recipe = (ingredients: { name: string; amount: string }[], title = '親子丼') => ({
  title,
  url: 'https://recipe.example.com/api/track/recipe/r1',
  ingredients,
})

describe('buildIngredientsText', () => {
  it('分量があれば名前の後ろに付け、無ければ名前だけにする', () => {
    const text = buildIngredientsText(recipe([
      { name: '鶏もも肉', amount: '' },
      { name: 'にんじん', amount: '1本' },
    ]))
    expect(text).toBe('🥕 親子丼 の材料\n・鶏もも肉\n・にんじん 1本')
  })

  it('材料が空なら「材料情報がありません」', () => {
    expect(buildIngredientsText(recipe([]))).toBe(`🥕 親子丼 の材料\n${NO_INGREDIENTS_TEXT}`)
  })

  it('名前が空の材料は出さない', () => {
    expect(buildIngredientsText(recipe([{ name: ' ', amount: '' }]))).toContain(NO_INGREDIENTS_TEXT)
  })

  it('長くてもテキストの上限（5000 文字）に収める', () => {
    const many = Array.from({ length: 2000 }, (_, i) => ({ name: `材料${i}`, amount: '' }))
    expect(buildIngredientsText(recipe(many)).length).toBeLessThanOrEqual(5000)
  })
})

describe('buildIngredientsMessages', () => {
  it('材料のテキストと、レシピを開くボタンの 2 通を返す', () => {
    const messages = buildIngredientsMessages(recipe([{ name: '卵', amount: '' }]))
    expect(messages).toHaveLength(2)
    expect(messages[0].type).toBe('text')
    expect(JSON.stringify(messages[1])).toContain('https://recipe.example.com/api/track/recipe/r1')
  })

  it('URL が https でない（NEXT_PUBLIC_APP_URL 未設定）ときはボタンを省き、材料だけは届ける', () => {
    const messages = buildIngredientsMessages({ ...recipe([{ name: '卵', amount: '' }]), url: '/api/track/recipe/r1' })
    expect(messages).toHaveLength(1)
    expect(messages[0].type).toBe('text')
  })
})
