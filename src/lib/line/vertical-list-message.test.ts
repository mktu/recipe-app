import { describe, it, expect } from 'vitest'
import type { RecipeCardData } from './flex-message'
import { createVerticalListMessage } from './vertical-list-message'

/** LINE のアクション label 上限。超えると reply 全体が 400 で落ちる */
const ACTION_LABEL_MAX = 40

const card = (title: string): RecipeCardData => ({
  title,
  url: 'https://example.com/api/track/recipe/abc',
  imageUrl: 'https://example.com/image.jpg',
  sourceName: 'テストサイト',
  cookingTimeMinutes: 15,
  ingredientCount: 5,
})

/** Flex のツリーから uri アクションを全部集める */
function collectUriActions(node: unknown, acc: { label?: string; uri?: string }[] = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectUriActions(child, acc))
    return acc
  }
  if (!node || typeof node !== 'object') return acc
  const obj = node as Record<string, unknown>
  if (obj.type === 'uri') acc.push(obj as { label?: string; uri?: string })
  Object.values(obj).forEach((value) => collectUriActions(value, acc))
  return acc
}

describe('createVerticalListMessage', () => {
  it('40文字を超えるタイトルでも action の label を上限内に収める', () => {
    // 本番で 400 を踏んだ実際のタイトル（42文字）
    const longTitle = 'きのことベーコンのバターしょうゆスパゲッティ【まいたけとエリンギで人気の和風パスタ】'
    expect(longTitle.length).toBeGreaterThan(ACTION_LABEL_MAX)

    const message = createVerticalListMessage([card(longTitle)], 'https://liff.line.me/x', 1, '🆕 最近追加したレシピ')

    for (const action of collectUriActions(message)) {
      expect((action.label ?? '').length).toBeLessThanOrEqual(ACTION_LABEL_MAX)
    }
  })

  it('上限以内のタイトルはそのまま label に使う', () => {
    const title = 'だしたまぶっかけ'
    const message = createVerticalListMessage([card(title)], 'https://liff.line.me/x', 1, '🆕 最近追加したレシピ')

    const labels = collectUriActions(message).map((a) => a.label)
    expect(labels).toContain(title)
  })

  it('タイトルを切り詰めても表示テキストは省略しない', () => {
    const longTitle = 'きのことベーコンのバターしょうゆスパゲッティ【まいたけとエリンギで人気の和風パスタ】'
    const message = createVerticalListMessage([card(longTitle)], 'https://liff.line.me/x', 1)

    expect(JSON.stringify(message)).toContain(longTitle)
  })
})

/** Flex のツリーから postback アクションを全部集める */
function collectPostbackActions(node: unknown, acc: { label?: string; data?: string; displayText?: string }[] = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectPostbackActions(child, acc))
    return acc
  }
  if (!node || typeof node !== 'object') return acc
  const obj = node as Record<string, unknown>
  if (obj.type === 'postback') acc.push(obj as { label?: string; data?: string; displayText?: string })
  Object.values(obj).forEach((value) => collectPostbackActions(value, acc))
  return acc
}

describe('createVerticalListMessage の [材料] ボタン（#213）', () => {
  it('recipeId があれば、行ごとに材料の postback を付ける', () => {
    const message = createVerticalListMessage([{ ...card('親子丼'), recipeId: 'r1' }], 'https://liff.line.me/x', 1)
    const [action] = collectPostbackActions(message)
    expect(action).toMatchObject({ label: '材料', displayText: '親子丼の材料' })
    expect(action.data).toContain('recipeId=r1')
  })

  it('recipeId が無ければボタンを出さない', () => {
    const message = createVerticalListMessage([card('親子丼')], 'https://liff.line.me/x', 1)
    expect(collectPostbackActions(message)).toHaveLength(0)
  })
})
