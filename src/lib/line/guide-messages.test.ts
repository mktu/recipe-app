import { afterEach, describe, it, expect, vi } from 'vitest'
import type { messagingApi } from '@line/bot-sdk'
import { RECIPE_NOTE_PROMPT } from '@/lib/recipe/note-markdown/prompt'
import { resolveMessageRoute } from './message-route'
import {
  FORMAT_KEYWORD,
  buildFormatMessages,
  buildHelpMessages,
  buildRecipeAddGuideMessage,
  buildWelcomeMessages,
  isFormatKeyword,
  isRecipeAddKeyword,
} from './guide-messages'

type TextMessage = messagingApi.TextMessage

function actionsOf(message: TextMessage): messagingApi.Action[] {
  return (message.quickReply?.items ?? []).flatMap((item) => (item.action ? [item.action] : []))
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('キーワード判定', () => {
  it('「レシピ追加」は完全一致だけ', () => {
    expect(isRecipeAddKeyword('レシピ追加')).toBe(true)
    expect(isRecipeAddKeyword(' レシピ追加 ')).toBe(true)
    expect(isRecipeAddKeyword('レシピ追加したい')).toBe(false)
  })

  it('「書式を見る」と「書式」を受け付ける', () => {
    expect(isFormatKeyword('書式を見る')).toBe(true)
    expect(isFormatKeyword('書式')).toBe(true)
    expect(isFormatKeyword('書式を見るには')).toBe(false)
  })

  it('書式（プロンプト）をそのまま送り返してもキーワードにはならない', () => {
    expect(isFormatKeyword(RECIPE_NOTE_PROMPT)).toBe(false)
    expect(isRecipeAddKeyword(RECIPE_NOTE_PROMPT)).toBe(false)
  })
})

describe('buildRecipeAddGuideMessage', () => {
  it('3つの追加方法を並べ、「書式を見る」と作成画面のクイックリプライを付ける', () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '1234-abcd')
    const message = buildRecipeAddGuideMessage()
    expect(message.text).toMatch(/①[\s\S]*②[\s\S]*③/)
    expect(actionsOf(message)).toEqual([
      { type: 'message', label: FORMAT_KEYWORD, text: FORMAT_KEYWORD },
      { type: 'uri', label: 'マイレシピを書く', uri: 'https://liff.line.me/1234-abcd/notes/new' },
    ])
  })

  it('一番上の案内には「AI」を出さない', () => {
    expect(buildRecipeAddGuideMessage().text).not.toMatch(/AI/)
  })

  it('LIFF_ID が空（dev）なら作成画面のボタンは出さない', () => {
    vi.stubEnv('NEXT_PUBLIC_LIFF_ID', '')
    expect(actionsOf(buildRecipeAddGuideMessage()).map((a) => a.label)).toEqual([FORMAT_KEYWORD])
  })

  it('クイックリプライのボタンは「書式を見る」キーワードとして処理される', () => {
    const [format] = actionsOf(buildRecipeAddGuideMessage()) as messagingApi.MessageAction[]
    expect(isFormatKeyword(format?.text ?? '')).toBe(true)
  })
})

describe('buildFormatMessages', () => {
  it('説明と書式本体を別の吹き出しにし、書式の吹き出しには文面だけを入れる', () => {
    const [explain, format] = buildFormatMessages() as TextMessage[]
    expect(explain.text).not.toContain(RECIPE_NOTE_PROMPT)
    expect(format.text).toBe(RECIPE_NOTE_PROMPT)
  })

  it('説明の吹き出しを送り返しても、ノート登録やヒントには流れない', () => {
    const [explain] = buildFormatMessages() as TextMessage[]
    expect(resolveMessageRoute(explain.text)).toBe('search')
  })
})

describe('「使い方」と友だち追加時のあいさつ', () => {
  it('どちらも追加方法の案内を最後の吹き出しに置く（クイックリプライが出る位置）', () => {
    const guide = buildRecipeAddGuideMessage()
    expect(buildHelpMessages().at(-1)).toEqual(guide)
    expect(buildWelcomeMessages('https://example.com').at(-1)).toEqual(guide)
  })

  it('あいさつには規約とプライバシーポリシーのリンクを残す', () => {
    const texts = (buildWelcomeMessages('https://example.com') as TextMessage[]).map((m) => m.text).join('\n')
    expect(texts).toContain('https://example.com/terms')
    expect(texts).toContain('https://example.com/privacy')
  })
})
