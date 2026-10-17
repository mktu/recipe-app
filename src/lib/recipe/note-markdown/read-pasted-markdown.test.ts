import { describe, it, expect } from 'vitest'
import { RECIPE_NOTE_PROMPT } from './prompt'
import { readPastedMarkdown } from './read-pasted-markdown'

/** AI の返事をそのままコピーした形（前置き・コードフェンス・締めの言葉つき） */
const AI_REPLY = `いいですね！レシピをまとめました。

\`\`\`
[レシピ入力]
# 豚こまのしょうが焼き
調理時間: 15分

## 材料（2人分）
- 豚こま切れ肉 200g
- 玉ねぎ 1/2個
- しょうが 1かけ

## 手順
1. 玉ねぎを薄切りにする
2. 豚肉と玉ねぎを炒め、しょうがを加える

[ここまで]
\`\`\`

ぜひ作ってみてください！`

describe('readPastedMarkdown', () => {
  it('登録できる内容は編集フォームの初期値になる', () => {
    const result = readPastedMarkdown(AI_REPLY)
    expect(result).toEqual({
      kind: 'ready',
      note: {
        id: '',
        recipeId: null,
        imageUrl: null,
        imageKey: null,
        title: '豚こまのしょうが焼き',
        ingredients: [
          { name: '豚こま切れ肉', amount: '200g' },
          { name: '玉ねぎ', amount: '1/2個' },
          { name: 'しょうが', amount: '1かけ' },
        ],
        steps: ['玉ねぎを薄切りにする', '豚肉と玉ねぎを炒め、しょうがを加える'],
        servings: '2人分',
        memo: null,
        cookingTimeMinutes: 15,
      },
      warnings: [],
    })
  })

  it('警告があっても登録できるなら編集へ進め、警告を渡す', () => {
    const result = readPastedMarkdown('# 冷奴\n\n## 材料\n- 豆腐 1丁')
    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') return
    expect(result.warnings.map((w) => w.message)).toContain('手順がありません')
  })

  it('表を含む内容は止めて理由を返す', () => {
    const result = readPastedMarkdown('# 冷奴\n\n## 材料\n| 材料 | 分量 |\n|---|---|\n| 豆腐 | 1丁 |')
    expect(result.kind).toBe('blocked')
    if (result.kind !== 'blocked') return
    expect(result.reasons.some((r) => r.startsWith('表が含まれています'))).toBe(true)
  })

  it('材料が無い内容は止める', () => {
    expect(readPastedMarkdown('# 冷奴\n\n## 手順\n1. 豆腐を切る')).toEqual({ kind: 'blocked', reasons: ['材料がありません'] })
  })

  it('プロンプトの文面をそのまま貼っても出力例は取り込まない', () => {
    expect(readPastedMarkdown(RECIPE_NOTE_PROMPT).kind).toBe('blocked')
  })
})
