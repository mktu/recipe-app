import { describe, it, expect } from 'vitest'
import { normalizeIngredientName, splitIngredientNames } from './normalize-ingredient'

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

  describe('切り方の除去', () => {
    it('切り方を除去して基底食材名に寄せる', () => {
      expect(normalizeIngredientName('唐辛子輪切り')).toBe('唐辛子')
      expect(normalizeIngredientName('きゅうり小口切り')).toBe('きゅうり')
      expect(normalizeIngredientName('にんにくみじん切り')).toBe('にんにく')
      expect(normalizeIngredientName('大根いちょう切り')).toBe('大根')
      expect(normalizeIngredientName('鶏もも肉そぎ切り')).toBe('鶏もも肉')
    })

    it('括弧付きの切り方も除去する', () => {
      expect(normalizeIngredientName('唐辛子（輪切り）')).toBe('唐辛子')
      expect(normalizeIngredientName('ねぎ(小口切り)')).toBe('ねぎ')
    })

    it('長い切り方を優先して除去する（残骸を残さない）', () => {
      // 「みじん切り」が先にマッチすると「粗」が残ってしまう
      expect(normalizeIngredientName('玉ねぎ粗みじん切り')).toBe('玉ねぎ')
      expect(normalizeIngredientName('玉ねぎくし形切り')).toBe('玉ねぎ')
    })
  })

  describe('切り方に見えるが除去してはいけない語', () => {
    it('食材名の一部である「こま切れ」を保持する', () => {
      // マスタに `豚こま切れ肉` `牛こま切れ肉` が存在する
      expect(normalizeIngredientName('豚こま切れ肉')).toBe('豚こま切れ肉')
      expect(normalizeIngredientName('牛こま切れ肉')).toBe('牛こま切れ肉')
      expect(normalizeIngredientName('豚細切れ肉')).toBe('豚細切れ肉')
    })

    it('「薄切り」は除去しない', () => {
      // マスタに `牛薄切り肉` が存在するため、除去すると `牛肉` に丸まって粒度が落ちる
      expect(normalizeIngredientName('牛薄切り肉')).toBe('牛薄切り肉')
      expect(normalizeIngredientName('豚バラ薄切り肉')).toBe('豚バラ薄切り肉')
    })

    it('「切り」を含むだけの食材名を保持する', () => {
      expect(normalizeIngredientName('切り干し大根')).toBe('切り干し大根')
      expect(normalizeIngredientName('豚肉切り落とし')).toBe('豚肉切り落とし')
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

describe('splitIngredientNames', () => {
  it('「、」で並記された食材を分割する', () => {
    expect(splitIngredientNames('細ネギ小口切り、七味')).toEqual(['細ネギ小口切り', '七味'])
    expect(splitIngredientNames('にんじん、玉ねぎ、じゃがいも')).toEqual([
      'にんじん',
      '玉ねぎ',
      'じゃがいも',
    ])
  })

  it('全角カンマでも分割する', () => {
    expect(splitIngredientNames('塩，こしょう')).toEqual(['塩', 'こしょう'])
  })

  it('区切り文字が無い場合は1件で返す', () => {
    expect(splitIngredientNames('なす')).toEqual(['なす'])
    expect(splitIngredientNames('豚こま切れ肉 200g')).toEqual(['豚こま切れ肉 200g'])
  })

  it('「・」では分割しない', () => {
    // 「牛・豚合いびき肉」のように単一食材で使われるため対象外
    expect(splitIngredientNames('牛・豚合いびき肉')).toEqual(['牛・豚合いびき肉'])
  })

  it('空断片・前後の空白を落とす', () => {
    expect(splitIngredientNames('なす、')).toEqual(['なす'])
    expect(splitIngredientNames('なす、 、トマト')).toEqual(['なす', 'トマト'])
    expect(splitIngredientNames('なす 、 トマト')).toEqual(['なす', 'トマト'])
    expect(splitIngredientNames('')).toEqual([])
    expect(splitIngredientNames('   ')).toEqual([])
  })

  it('既知の制限: 括弧の中の「、」でも分割される', () => {
    // 「野菜にんじん」は未マッチとして auto-alias に回るが、「玉ねぎ」が拾えるぶん
    // 分割しない場合（全体が1つのゴミ名になる）より改善するため許容する
    expect(splitIngredientNames('野菜（にんじん、玉ねぎ）')).toEqual([
      '野菜（にんじん',
      '玉ねぎ）',
    ])
    expect(normalizeIngredientName('野菜（にんじん')).toBe('野菜にんじん')
    expect(normalizeIngredientName('玉ねぎ）')).toBe('玉ねぎ')
  })
})
