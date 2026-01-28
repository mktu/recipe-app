import { describe, it, expect } from 'vitest'
import { normalizeIngredientName } from './normalize-ingredient'

describe('normalizeIngredientName', () => {
  describe('基本的な正規化', () => {
    it('数字+単位（スペースなし）を除去する', () => {
      expect(normalizeIngredientName('豚肉細切れ200g')).toBe('豚肉細切れ')
      expect(normalizeIngredientName('鶏もも肉300g')).toBe('鶏もも肉')
      expect(normalizeIngredientName('卵2個')).toBe('卵')
      expect(normalizeIngredientName('なす2本')).toBe('なす')
    })

    it('調理用語・分量表現を除去する', () => {
      expect(normalizeIngredientName('塩 少々')).toBe('塩')
      expect(normalizeIngredientName('こしょう 適量')).toBe('こしょう')
      expect(normalizeIngredientName('ごま油 大さじ1')).toBe('ごま油')
      expect(normalizeIngredientName('砂糖 小さじ2')).toBe('砂糖')
    })

    it('括弧記号を除去し中身は保持する', () => {
      expect(normalizeIngredientName('鶏もも肉（皮なし）')).toBe('鶏もも肉皮なし')
      expect(normalizeIngredientName('豆腐(絹ごし)')).toBe('豆腐絹ごし')
    })
  })

  describe('ブランド名の除去', () => {
    it('醤油系ブランドを除去する', () => {
      expect(normalizeIngredientName('キッコーマン醤油')).toBe('醤油')
      expect(normalizeIngredientName('ヤマサ醤油')).toBe('醤油')
    })

    it('みりん系ブランドを除去する', () => {
      expect(normalizeIngredientName('マンジョウ本みりん')).toBe('本みりん')
    })

    it('調味料系ブランドを除去する', () => {
      expect(normalizeIngredientName('ミツカン穀物酢')).toBe('穀物酢')
      expect(normalizeIngredientName('カゴメトマトケチャップ')).toBe('トマトケチャップ')
      expect(normalizeIngredientName('キユーピーマヨネーズ')).toBe('マヨネーズ')
    })

    it('ブランド名と分量表現を同時に除去する', () => {
      expect(normalizeIngredientName('キッコーマン醤油 大さじ1')).toBe('醤油')
      expect(normalizeIngredientName('日清サラダ油 大さじ2')).toBe('サラダ油')
    })
  })

  describe('孤立した数字の除去', () => {
    it('末尾の孤立した数字を除去する', () => {
      expect(normalizeIngredientName('醤油 1')).toBe('醤油')
      expect(normalizeIngredientName('みりん 2')).toBe('みりん')
    })

    it('先頭の孤立した数字を除去する', () => {
      expect(normalizeIngredientName('1/2 玉ねぎ')).toBe('玉ねぎ')
      expect(normalizeIngredientName('2 にんじん')).toBe('にんじん')
    })
  })

  describe('精度重視: 食材名の一部になりうる単位は除去しない', () => {
    it('玉を含む食材名を保持する', () => {
      expect(normalizeIngredientName('玉ねぎ')).toBe('玉ねぎ')
      expect(normalizeIngredientName('にんにく1玉')).toBe('にんにく1玉')
    })

    it('株を含む食材名を保持する', () => {
      expect(normalizeIngredientName('しめじ1株')).toBe('しめじ1株')
      expect(normalizeIngredientName('白菜1/4株')).toBe('白菜1/4株')
    })

    it('房を含む食材名を保持する', () => {
      expect(normalizeIngredientName('ぶどう1房')).toBe('ぶどう1房')
      expect(normalizeIngredientName('ブロッコリー1房')).toBe('ブロッコリー1房')
    })

    it('スペースを挟んだ数字+単位は除去しない（誤除去防止）', () => {
      // "1/2 玉ねぎ" の "玉" を誤って除去しないことを確認
      expect(normalizeIngredientName('1/2 玉ねぎ')).toBe('玉ねぎ')
      // "1 株" のようなパターンでも食材名が残る
      expect(normalizeIngredientName('しめじ 1株')).toBe('しめじ 1株')
    })
  })

  describe('エッジケース', () => {
    it('空文字列を処理できる', () => {
      expect(normalizeIngredientName('')).toBe('')
    })

    it('スペースのみの入力を処理できる', () => {
      expect(normalizeIngredientName('   ')).toBe('')
    })

    it('既に正規化された食材名はそのまま返す', () => {
      expect(normalizeIngredientName('なす')).toBe('なす')
      expect(normalizeIngredientName('鶏肉')).toBe('鶏肉')
      expect(normalizeIngredientName('トマト')).toBe('トマト')
    })
  })
})
