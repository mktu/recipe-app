import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import type { messagingApi } from '@line/bot-sdk'
import type { RecipeNoteFields } from '@/types/recipe'
import {
  MAX_WARNINGS_IN_REPLY,
  buildNotRegistrableText,
  buildPrefixHintText,
  buildRegisteredMessages,
} from './note-import-messages'

const FIELDS: RecipeNoteFields = {
  title: '鶏むね肉のレモン蒸し',
  ingredients: [
    { name: '鶏むね肉', amount: '300g' },
    { name: 'レモン', amount: '1/2個' },
  ],
  steps: ['そぎ切りにする', '蒸す'],
  imageKey: null,
  servings: '2人分',
  memo: null,
  cookingTimeMinutes: 20,
}
const SAVED = { noteId: 'note-1', recipeId: 'recipe-1' }

/** Flex のツリーから uri アクションの uri を全部集める */
function collectUris(node: unknown, acc: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((child) => collectUris(child, acc))
    return acc
  }
  if (!node || typeof node !== 'object') return acc
  const obj = node as Record<string, unknown>
  if (obj.type === 'uri' && typeof obj.uri === 'string') acc.push(obj.uri)
  Object.values(obj).forEach((value) => collectUris(value, acc))
  return acc
}

const textOf = (message: messagingApi.Message) => (message as messagingApi.TextMessage).text

describe('buildRegisteredMessages', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', 'liff-123')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('テキストとカードの2通を返し、テキストにタイトルが入る', () => {
    const messages = buildRegisteredMessages(FIELDS, [], SAVED)
    expect(messages.map((m) => m.type)).toEqual(['text', 'flex'])
    expect(textOf(messages[0])).toContain('鶏むね肉のレモン蒸し')
    expect(textOf(messages[0])).not.toContain('⚠️')
  })

  it('カードのリンクはノートの LIFF URL を直接載せる（track ルートを挟まない）', () => {
    const [, card] = buildRegisteredMessages(FIELDS, [], SAVED)
    expect(collectUris(card)).toEqual(['https://liff.line.me/liff-123/notes/note-1?from=line'])
  })

  it('警告があればテキストに載せる', () => {
    const [text] = buildRegisteredMessages(FIELDS, [{ message: '手順がありません' }], SAVED)
    expect(textOf(text)).toContain('・手順がありません')
  })

  it(`警告は ${MAX_WARNINGS_IN_REPLY} 件までにして、残りは件数だけ伝える`, () => {
    const warnings = Array.from({ length: MAX_WARNINGS_IN_REPLY + 3 }, (_, i) => ({ message: `警告${i + 1}` }))
    const body = textOf(buildRegisteredMessages(FIELDS, warnings, SAVED)[0])
    expect(body).toContain(`・警告${MAX_WARNINGS_IN_REPLY}`)
    expect(body).not.toContain(`・警告${MAX_WARNINGS_IN_REPLY + 1}`)
    expect(body).toContain('…ほか3件')
  })
})

describe('buildNotRegistrableText', () => {
  it('理由をすべて載せ、接頭語を残して送り直すよう案内する', () => {
    const text = buildNotRegistrableText(['タイトルがありません', '材料がありません'])
    expect(text).toContain('・タイトルがありません\n・材料がありません')
    expect(text).toContain('[レシピ入力]')
  })
})

describe('buildPrefixHintText', () => {
  it('接頭語を示すが、行頭には置かない（送り返されてもノート登録にならない）', () => {
    const text = buildPrefixHintText()
    expect(text).toContain('[レシピ入力]')
    expect(text.split('\n').some((line) => line.trimStart().startsWith('[レシピ入力]'))).toBe(false)
  })
})
