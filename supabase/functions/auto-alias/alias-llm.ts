// THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY
// Source: src/lib/batch/alias-llm.ts
// Run: npx tsx scripts/build-edge-functions.ts

/**
 * 食材エイリアス自動生成 - LLM操作
 */

import type { MasterIngredient } from './alias-db.ts'

/** 有効なカテゴリ一覧 */
const VALID_CATEGORIES = [
  '野菜',
  '肉',
  '魚介',
  'きのこ',
  '卵・乳製品',
  '豆腐・大豆製品',
  '穀物・麺類',
  'その他',
]

const GEMINI_MODEL = 'gemini-2.5-flash'

export interface LLMMatchResult {
  input: string
  matchedId: string | null
  isNewIngredient: boolean
  newIngredientCategory?: string
  reason: string
}

export interface LLMResponse {
  results: LLMMatchResult[]
}

export function buildPrompt(
  unmatchedNames: string[],
  masterIngredients: MasterIngredient[]
): string {
  const masterList = masterIngredients
    .map((m) => `- ${m.name} (id: ${m.id})`)
    .join('\n')

  const unmatchedList = unmatchedNames
    .map((name, i) => `${i + 1}. ${name}`)
    .join('\n')

  return `あなたは食材名のマッチングを行う専門家です。

## タスク
以下の「未マッチ食材リスト」の各食材が、「マスター食材リスト」のどれに該当するか判定してください。

## 判定ルール
1. 表記揺れ（カタカナ/ひらがな、漢字の違い）は同一食材として扱う
   例: 「長ネギ」→「ねぎ」、「ニンジン」→「にんじん」
2. 調理形態の違い（薄切り、細切れ等）は同一食材として扱う
   例: 「豚バラ薄切り肉」→「豚バラ肉」
3. ただし、食材の種類が異なる場合は区別する
   例: 「豚バラ肉」と「豚こま肉」は別物
4. マスターに該当する食材がない場合は新規食材として判定
5. 調味料や一般的でない食材は新規食材として追加しない（isNewIngredient: false, matchedId: null）

## マスター食材リスト
${masterList}

## 未マッチ食材リスト
${unmatchedList}

## 出力形式
必ず以下のJSON形式で出力してください:
{
  "results": [
    {
      "input": "入力された食材名",
      "matchedId": "マッチしたマスター食材のID（マッチしない場合はnull）",
      "isNewIngredient": true/false,
      "newIngredientCategory": "新規食材の場合のカテゴリ（${VALID_CATEGORIES.join(', ')}）",
      "reason": "判定理由"
    }
  ]
}`
}

export async function callGeminiAPI(
  prompt: string,
  apiKey: string
): Promise<LLMResponse | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error(`Gemini API error: ${response.status} - ${error}`)
    return null
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    console.error('No text in Gemini response')
    return null
  }

  try {
    return JSON.parse(text) as LLMResponse
  } catch (e) {
    console.error('Failed to parse Gemini response:', e)
    return null
  }
}
