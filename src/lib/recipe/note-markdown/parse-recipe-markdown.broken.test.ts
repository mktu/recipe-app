/**
 * AI の出力によくある崩れ方。LINE ではパース結果がそのまま登録されるので、
 * 「推測で混ぜない」「読み飛ばしたら警告する」を確かめる。
 */
import { describe, it, expect } from 'vitest'
import { looksLikeRecipeMarkdown, parseRecipeMarkdown } from './parse-recipe-markdown'

const RECIPE = `# 豚の生姜焼き
## 材料
- 豚ロース 200g
## 手順
1. 焼く`

describe('parseRecipeMarkdown: 前置き・締めの言葉', () => {
  it('コードフェンスで囲まれ、前後に AI の言葉がある', () => {
    const md = `いいですね！以下がレシピです。\n\n\`\`\`markdown\n[レシピ入力]\n${RECIPE}\n\`\`\`\n\nいかがでしょうか？`
    const { fields, warnings } = parseRecipeMarkdown(md)
    expect(fields.title).toBe('豚の生姜焼き')
    expect(fields.steps).toEqual(['焼く'])
    expect(warnings).toEqual([])
  })

  it('フェンスが無く、手順の後ろに締めの言葉がある', () => {
    const md = `[レシピ入力]\n${RECIPE}\n2. 盛り付ける\n\nいかがでしょうか？\nぜひ作ってみてください！`
    const { fields, warnings } = parseRecipeMarkdown(md)
    expect(fields.steps).toEqual(['焼く', '盛り付ける'])
    expect(warnings.map((w) => w.line)).toEqual(['いかがでしょうか？', 'ぜひ作ってみてください！'])
  })

  it('終端マーカーがあれば、最後のメモに締めの言葉が入らない', () => {
    const md = `[レシピ入力]\n${RECIPE}\n## メモ\n冷蔵で2日\n[ここまで]\nぜひ作ってみてください！`
    const { fields, warnings } = parseRecipeMarkdown(md)
    expect(fields.memo).toBe('冷蔵で2日')
    expect(warnings).toEqual([])
  })

  it('終端マーカーが無ければ、最後のメモに締めの言葉が入る（既知の限界）', () => {
    const md = `[レシピ入力]\n${RECIPE}\n## メモ\n冷蔵で2日\nぜひ作ってみてください！`
    expect(parseRecipeMarkdown(md).fields.memo).toBe('冷蔵で2日\nぜひ作ってみてください！')
  })

  it('タイトルの前にある前置きはタイトルにしない', () => {
    const md = `はい、作りましょう。\n${RECIPE}`
    expect(parseRecipeMarkdown(md).fields.title).toBe('豚の生姜焼き')
  })
})

describe('parseRecipeMarkdown: 記法の崩れ', () => {
  it('# のタイトルが無ければ最初の行をタイトルにして警告する', () => {
    const md = '豚の生姜焼き\n## 材料\n- 豚ロース 200g\n## 手順\n1. 焼く'
    const result = parseRecipeMarkdown(md)
    expect(result.fields.title).toBe('豚の生姜焼き')
    expect(result.warnings[0].message).toContain('最初の行をタイトルにしました')
    expect(result.registrable).toBe(true)
  })

  it('全角の番号・閉じ括弧の番号・丸数字を手順として読む', () => {
    const md = '# a\n## 材料\n- 塩\n## 手順\n１．切る\n2) 焼く\n③ 盛る\n(4) 食べる'
    expect(parseRecipeMarkdown(md).fields.steps).toEqual(['切る', '焼く', '盛る', '食べる'])
  })

  it('・や * の箇条書きを材料として読む', () => {
    const md = '# a\n## 材料\n・塩 少々\n* 胡椒 適量\n## 手順\n1. ふる'
    expect(parseRecipeMarkdown(md).fields.ingredients).toEqual([
      { name: '塩', amount: '少々' },
      { name: '胡椒', amount: '適量' },
    ])
  })

  it('手順が番号なしの段落だけなら1行を1手順とする', () => {
    const md = '# a\n## 材料\n- 塩\n## 手順\n切る\n焼く'
    expect(parseRecipeMarkdown(md).fields.steps).toEqual(['切る', '焼く'])
  })

  it('手順の折り返しと入れ子の箇条書きは前の手順の続きにする', () => {
    const md = '# a\n## 材料\n- 塩\n## 手順\n1. 鍋に湯を沸かし、\n塩を入れる\n2. 麺をゆでる\n   - 表示時間より1分短く'
    expect(parseRecipeMarkdown(md).fields.steps).toEqual(['鍋に湯を沸かし、塩を入れる', '麺をゆでる表示時間より1分短く'])
  })

  it('太字を外す', () => {
    const md = '# **生姜焼き**\n## 材料\n- **豚ロース** 200g\n## 手順\n1. **強火**で焼く'
    const { fields } = parseRecipeMarkdown(md)
    expect(fields.title).toBe('生姜焼き')
    expect(fields.ingredients).toEqual([{ name: '豚ロース', amount: '200g' }])
    expect(fields.steps).toEqual(['強火で焼く'])
  })

  it('見出しとタイトルの絵文字を外して認める（ChatGPT がよく付ける）', () => {
    const md = '# 🍳 生姜焼き\n## 🥬 材料（2人分）\n- 豚ロース 200g\n## 👩‍🍳 作り方\n1. 焼く\n## 💡 ポイント\n- 強火で'
    const { fields } = parseRecipeMarkdown(md)
    expect(fields.title).toBe('生姜焼き')
    expect(fields.servings).toBe('2人分')
    expect(fields.ingredients).toEqual([{ name: '豚ロース', amount: '200g' }])
    expect(fields.steps).toEqual(['焼く'])
    expect(fields.memo).toBe('・強火で')
  })

  it('手順本文の絵文字は残す', () => {
    const md = '# a\n## 材料\n- 塩\n## 手順\n1. 完成🎉'
    expect(parseRecipeMarkdown(md).fields.steps).toEqual(['完成🎉'])
  })

  it('CRLF を扱える', () => {
    expect(parseRecipeMarkdown(RECIPE.replace(/\n/g, '\r\n')).fields.steps).toEqual(['焼く'])
  })
})

describe('parseRecipeMarkdown: 材料のグループ', () => {
  it('### の小見出しと【A】をグループとして分量の側に残す', () => {
    const md = '# a\n## 材料\n- 豚肉 200g\n### たれ\n- 醤油 大さじ1\n【A】\n- みりん 大さじ1\n## 手順\n1. 焼く'
    expect(parseRecipeMarkdown(md).fields.ingredients).toEqual([
      { name: '豚肉', amount: '200g' },
      { name: '醤油', amount: '大さじ1（たれ）' },
      { name: 'みりん', amount: '大さじ1（A）' },
    ])
  })

  it('太字だけの行は材料ではなくグループにする', () => {
    const md = '# a\n## 材料\n- 豚肉 200g\n\n**合わせ調味料**\n- 味噌 大さじ1\n## 手順\n1. **合わせ調味料**を入れる'
    const { fields } = parseRecipeMarkdown(md)
    expect(fields.ingredients).toEqual([
      { name: '豚肉', amount: '200g' },
      { name: '味噌', amount: '大さじ1（合わせ調味料）' },
    ])
    expect(fields.steps).toEqual(['合わせ調味料を入れる'])
  })

  it('太字だけの行をタイトルとして認める', () => {
    expect(parseRecipeMarkdown('**生姜焼き**\n## 材料\n- 豚肉').fields.title).toBe('生姜焼き')
  })

  it('行頭の (A) をグループとして扱う', () => {
    const md = '# a\n## 材料\n- (A)醤油 大さじ1\n## 手順\n1. 焼く'
    expect(parseRecipeMarkdown(md).fields.ingredients).toEqual([{ name: '醤油', amount: '大さじ1（A）' }])
  })

  it('材料の中の注意書きは読み飛ばして警告する', () => {
    const md = '# a\n## 材料\n- 塩 少々\n※分量はお好みで調整してください。\n## 手順\n1. ふる'
    const result = parseRecipeMarkdown(md)
    expect(result.fields.ingredients).toEqual([{ name: '塩', amount: '少々' }])
    expect(result.warnings[0].message).toBe('材料として読めない行を読み飛ばしました')
  })
})

describe('parseRecipeMarkdown: 登録してよいかの判定', () => {
  it('どんな入力でも例外を投げない', () => {
    for (const text of ['', '   ', '```', '[レシピ入力]', '#', '## 材料\n## 手順', '鶏むね肉 レモン']) {
      expect(() => parseRecipeMarkdown(text)).not.toThrow()
    }
  })

  it('タイトルが無ければ登録できない', () => {
    const result = parseRecipeMarkdown('## 材料\n- 塩\n## 手順\n1. ふる')
    expect(result.registrable).toBe(false)
    expect(result.blockingReasons).toEqual(['タイトルがありません'])
  })

  it('材料が無ければ登録できない（食材検索に載せるのが目的なので）', () => {
    const result = parseRecipeMarkdown('# a\n## 手順\n1. ふる')
    expect(result.registrable).toBe(false)
    expect(result.blockingReasons).toEqual(['材料がありません'])
  })

  it('手順が無くても登録できるが警告する', () => {
    const result = parseRecipeMarkdown('# a\n## 材料\n- 塩')
    expect(result.registrable).toBe(true)
    expect(result.warnings).toEqual([{ message: '手順がありません' }])
  })

  it('接頭語だけ・空なら登録できない', () => {
    expect(parseRecipeMarkdown('[レシピ入力]').blockingReasons).toEqual(['タイトルがありません', '材料がありません'])
  })

  it('調理時間が読めなければ null にして警告する', () => {
    const result = parseRecipeMarkdown(`${RECIPE}\n## メモ\n調理時間: すぐ`)
    expect(result.fields.cookingTimeMinutes).toBeNull()
    expect(result.warnings[0].message).toBe('調理時間「すぐ」を読み取れませんでした')
  })
})

describe('looksLikeRecipeMarkdown', () => {
  it('材料と手順の見出しがそろっていれば true（接頭語の有無を問わない）', () => {
    expect(looksLikeRecipeMarkdown(RECIPE)).toBe(true)
    expect(looksLikeRecipeMarkdown(`[レシピ入力]\n${RECIPE}`)).toBe(true)
  })

  it('普通の検索ワードや片方の見出しだけなら false', () => {
    expect(looksLikeRecipeMarkdown('鶏むね肉 レモン')).toBe(false)
    expect(looksLikeRecipeMarkdown('材料')).toBe(false)
    expect(looksLikeRecipeMarkdown('# a\n## 材料\n- 塩')).toBe(false)
  })
})
