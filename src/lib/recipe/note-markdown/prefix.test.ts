import { describe, it, expect } from 'vitest'
import { extractBodyLines, hasRecipeInputPrefix, RECIPE_INPUT_PREFIX } from './prefix'

describe('hasRecipeInputPrefix', () => {
  it('正の表記を判定する', () => {
    expect(hasRecipeInputPrefix(`${RECIPE_INPUT_PREFIX}\n# 鶏むね肉のレモン蒸し`)).toBe(true)
  })

  it('括弧と空白の表記ゆれを許容する', () => {
    expect(hasRecipeInputPrefix('【レシピ入力】\n# a')).toBe(true)
    expect(hasRecipeInputPrefix('［レシピ入力］\n# a')).toBe(true)
    expect(hasRecipeInputPrefix('  [ レシピ入力 ]  \n# a')).toBe(true)
  })

  it('AI の前置きやコードフェンスの後ろにあっても認める', () => {
    expect(hasRecipeInputPrefix('いいですね！\n[レシピ入力]\n# a')).toBe(true)
    expect(hasRecipeInputPrefix('```markdown\n[レシピ入力]\n# a\n```')).toBe(true)
  })

  it('行頭に無いもの・普通の検索ワードには反応しない', () => {
    expect(hasRecipeInputPrefix('鶏むね肉 レモン')).toBe(false)
    expect(hasRecipeInputPrefix('先頭に [レシピ入力] を付けるには？')).toBe(false)
    expect(hasRecipeInputPrefix('レシピ入力')).toBe(false)
  })
})

describe('extractBodyLines', () => {
  it('接頭語より前の行を捨て、接頭語を外す', () => {
    expect(extractBodyLines('いいですね！\n[レシピ入力]\n# a')).toEqual(['', '# a'])
  })

  it('接頭語と同じ行の続きは残す', () => {
    expect(extractBodyLines('[レシピ入力] # a')).toEqual(['# a'])
  })

  it('CRLF を扱える', () => {
    expect(extractBodyLines('[レシピ入力]\r\n# a\r\n')).toEqual(['', '# a', ''])
  })

  it('コードフェンスの中身だけを取る（接頭語がフェンスの外）', () => {
    expect(extractBodyLines('[レシピ入力]\n```markdown\n# a\n```\nいかがでしょうか？')).toEqual(['# a'])
  })

  it('コードフェンスの中身だけを取る（接頭語がフェンスの中）', () => {
    expect(extractBodyLines('はい！\n```\n[レシピ入力]\n# a\n```\nいかがでしょうか？')).toEqual(['', '# a'])
  })

  it('閉じ忘れのフェンスでも中身を取る', () => {
    expect(extractBodyLines('```markdown\n# a')).toEqual(['# a'])
  })

  it('終端マーカーより後ろ（締めの言葉）を捨てる', () => {
    expect(extractBodyLines('[レシピ入力]\n# a\n[ここまで]\nいかがでしょうか？')).toEqual(['', '# a'])
    expect(extractBodyLines('# a\n【ここまで】\nいかが')).toEqual(['# a'])
  })

  it('終端マーカーがフェンスの中にあっても外にあっても中身を取る', () => {
    expect(extractBodyLines('```\n[レシピ入力]\n# a\n[ここまで]\n```\nいかが')).toEqual(['', '# a'])
    expect(extractBodyLines('[レシピ入力]\n```\n# a\n```\n[ここまで]\nいかが')).toEqual(['# a'])
  })

  it('文中の「[ここまで]」では切らない', () => {
    expect(extractBodyLines('# a\n1. [ここまで] 混ぜる\n2. 焼く')).toEqual(['# a', '1. [ここまで] 混ぜる', '2. 焼く'])
  })

  it('接頭語もフェンスも無ければそのまま返す', () => {
    expect(extractBodyLines('# a\n## 材料')).toEqual(['# a', '## 材料'])
  })
})
