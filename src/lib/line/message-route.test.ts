import { describe, it, expect } from 'vitest'
import { resolveMessageRoute } from './message-route'
import { buildPrefixHintText } from './note-import-messages'
import { looksLikeRecipeMarkdown } from '@/lib/recipe/note-markdown/parse-recipe-markdown'

const RECIPE_BODY = `# 鶏むね肉のレモン蒸し

## 材料（2人分）
- 鶏むね肉 300g
- レモン 1/2個

## 手順
1. 鶏むね肉をそぎ切りにする
2. レモンをかけて蒸す`

describe('resolveMessageRoute', () => {
  it('接頭語付きのレシピ Markdown はノート登録', () => {
    expect(resolveMessageRoute(`[レシピ入力]\n${RECIPE_BODY}\n[ここまで]`)).toBe('note')
  })

  it('本文に URL が含まれていても、接頭語があればノート登録（URL 登録に流さない）', () => {
    const text = `[レシピ入力]\n${RECIPE_BODY}\n\n## メモ\n参考: https://example.com/recipe/123`
    expect(resolveMessageRoute(text)).toBe('note')
  })

  it('AI の前置きの後に接頭語があってもノート登録', () => {
    expect(resolveMessageRoute(`いいですね！まとめます。\n\n【レシピ入力】\n${RECIPE_BODY}`)).toBe('note')
  })

  it('接頭語の無いレシピらしい文は案内（検索に流さない）', () => {
    expect(resolveMessageRoute(RECIPE_BODY)).toBe('note-hint')
  })

  it('接頭語の無いレシピらしい文でも、URL を含めば従来どおり URL 登録（レシピサイトの共有文）', () => {
    const shared = '【材料】\n豚肉 200g\n【作り方】\n1. 焼く\nhttps://cookpad.com/recipe/123'
    expect(looksLikeRecipeMarkdown(shared)).toBe(true)
    expect(resolveMessageRoute(shared)).toBe('url')
  })

  it('案内文をそのまま送り返されてもノート登録にしない', () => {
    expect(resolveMessageRoute(buildPrefixHintText())).not.toBe('note')
  })

  it('URL だけなら URL 登録', () => {
    expect(resolveMessageRoute('https://cookpad.com/recipe/123')).toBe('url')
  })

  it('URL に一言添えても URL 登録', () => {
    expect(resolveMessageRoute('これ作りたい https://cookpad.com/recipe/123')).toBe('url')
  })

  it.each(['鶏肉', '鶏肉 玉ねぎ', '材料', '手順', '豚肉の生姜焼き 作り方'])('普通の検索語「%s」は検索のまま', (text) => {
    expect(resolveMessageRoute(text)).toBe('search')
  })

  it('文中で接頭語に触れているだけなら検索のまま', () => {
    expect(resolveMessageRoute('先頭に [レシピ入力] を付けるの？')).toBe('search')
  })
})
