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
    const md = `いいですね！以下がレシピです。\n\n\`\`\`markdown\n[レシピ入力]\n${RECIPE}\n[ここまで]\n\`\`\`\n\nいかがでしょうか？`
    const { fields, warnings } = parseRecipeMarkdown(md)
    expect(fields.title).toBe('豚の生姜焼き')
    expect(fields.steps).toEqual(['焼く'])
    expect(warnings).toEqual([])
  })

  it('フェンスが無く、手順の後ろに締めの言葉がある', () => {
    const md = `[レシピ入力]\n${RECIPE}\n2. 盛り付ける\n\nいかがでしょうか？\nぜひ作ってみてください！`
    const { fields, warnings } = parseRecipeMarkdown(md)
    expect(fields.steps).toEqual(['焼く', '盛り付ける'])
    // 先頭は終端マーカーが無いことの警告。締めの言葉はその後に並ぶ
    expect(warnings[0].message).toContain('[ここまで]')
    expect(warnings.slice(1).map((w) => w.line)).toEqual(['いかがでしょうか？', 'ぜひ作ってみてください！'])
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
    expect(parseRecipeMarkdown(md).fields.steps).toEqual(['鍋に湯を沸かし、塩を入れる', '麺をゆでる。表示時間より1分短く'])
  })

  it('子箇条書きは句点を挟んでつなぐ（前が句読点で終わっていれば挟まない）', () => {
    const md = '# a\n## 材料\n- 玉ねぎ\n## 手順\n1. 玉ねぎを炒める\n   - 弱火で20分\n   - 焦がさないように\n2. 塩をふる。\n   - 少しずつ'
    expect(parseRecipeMarkdown(md).fields.steps).toEqual([
      '玉ねぎを炒める。弱火で20分。焦がさないように',
      '塩をふる。少しずつ',
    ])
  })

  it('水平線（--- / *** / ___）を材料・手順にしない', () => {
    const md = '# a\n## 材料\n- 鶏肉 300g\n\n---\n\n## 作り方\n1. 焼く\n\n* * *\n\n___'
    const result = parseRecipeMarkdown(md)
    expect(result.fields.ingredients).toEqual([{ name: '鶏肉', amount: '300g' }])
    expect(result.fields.steps).toEqual(['焼く'])
    expect(result.warnings).toEqual([])
  })

  it('【材料】（2人分）のように括弧の後ろに補足が続く見出しを認める', () => {
    for (const heading of ['【材料】（2人分）', '**材料**（2人分）', '## 【材料】2人分']) {
      const md = `# a\n${heading}\n- 大根 1/2本\n【作り方】\n1. 煮る`
      const { fields, registrable } = parseRecipeMarkdown(md)
      expect(fields.ingredients).toEqual([{ name: '大根', amount: '1/2本' }])
      expect(fields.servings).toBe('2人分')
      expect(registrable).toBe(true)
    }
  })

  it('「下ごしらえ」も手順として読み、作り方と文書順につなぐ', () => {
    const md = '# a\n## 材料\n- 豚肉\n## 下ごしらえ\n1. 筋を切る\n2. 生姜をすりおろす\n## 作り方\n1. 焼く\n2. タレを絡める'
    const result = parseRecipeMarkdown(md)
    expect(result.fields.steps).toEqual(['筋を切る', '生姜をすりおろす', '焼く', 'タレを絡める'])
    expect(result.warnings).toEqual([])
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

  it('◎ や ◆ で揃えた材料行を消さず、記号をグループとして分量の側に残す', () => {
    const md = '# a\n## 材料\n- 大根 1/2本\n◎醤油 大さじ2\n◎みりん 大さじ2\n◆ 酒 50ml\n## 手順\n1. ◎を合わせる'
    expect(parseRecipeMarkdown(md).fields.ingredients).toEqual([
      { name: '大根', amount: '1/2本' },
      { name: '醤油', amount: '大さじ2（◎）' },
      { name: 'みりん', amount: '大さじ2（◎）' },
      { name: '酒', amount: '50ml（◆）' },
    ])
  })

  it('分量を含まない ◆ の行はこれまでどおりグループ見出しにする', () => {
    const md = '# a\n## 材料\n◆合わせ調味料\n- 醤油 大さじ1\n## 手順\n1. 焼く'
    expect(parseRecipeMarkdown(md).fields.ingredients).toEqual([{ name: '醤油', amount: '大さじ1（合わせ調味料）' }])
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

describe('parseRecipeMarkdown: 表（フォーマット違反）', () => {
  const TABLE_REASON = '表が含まれています。表を使わない形式で出力し直してください'

  it('材料が表なら登録を止め、表の行を材料に入れない', () => {
    const md = '# a\n## 材料\n| 材料 | 分量 |\n|---|---|\n| 鶏むね肉 | 300g |\n## 手順\n1. 焼く'
    const result = parseRecipeMarkdown(md)
    expect(result.fields.ingredients).toEqual([])
    expect(result.registrable).toBe(false)
    expect(result.blockingReasons).toEqual(['材料がありません', TABLE_REASON])
  })

  it('材料の一部だけが表でも登録を止める（黙って一部だけ登録しない）', () => {
    const md = '# a\n## 材料\n- 塩 少々\n| 鶏むね肉 | 300g |\n## 手順\n1. 焼く'
    const result = parseRecipeMarkdown(md)
    expect(result.fields.ingredients).toEqual([{ name: '塩', amount: '少々' }])
    expect(result.registrable).toBe(false)
    expect(result.blockingReasons).toEqual([TABLE_REASON])
  })

  it('材料以外のセクションの表でも登録を止める', () => {
    const md = '# a\n## 材料\n- 塩\n## 手順\n1. ふる\n## メモ\n| 栄養 | 値 |'
    expect(parseRecipeMarkdown(md).blockingReasons).toEqual([TABLE_REASON])
  })

  it('本文の外（終端マーカーの後ろ）の表は対象にしない', () => {
    const md = '[レシピ入力]\n# a\n## 材料\n- 塩\n## 手順\n1. ふる\n[ここまで]\n| 補足 | 表 |'
    expect(parseRecipeMarkdown(md).registrable).toBe(true)
  })

  it('材料名の中の「|」1つだけでは表とみなさない', () => {
    const md = '# a\n## 材料\n- 塩|胡椒 少々\n## 手順\n1. ふる'
    expect(parseRecipeMarkdown(md).registrable).toBe(true)
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
