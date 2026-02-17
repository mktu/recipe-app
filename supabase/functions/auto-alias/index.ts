/**
 * 食材エイリアス自動生成 Edge Function
 *
 * pg_cron から1日1回呼び出され、未マッチ食材をLLMで判定し
 * エイリアス登録または新規食材追加を行う。
 *
 * ADR-001: 食材マッチングの表記揺れ対応
 *
 * 環境変数:
 *   - SUPABASE_URL: 自動設定
 *   - SUPABASE_SERVICE_ROLE_KEY: 自動設定
 *   - GOOGLE_GENERATIVE_AI_API_KEY: 手動で Secrets に設定
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

// ===========================================
// 設定
// ===========================================

const MAX_ITEMS_PER_RUN = 100
const GEMINI_MODEL = 'gemini-2.5-flash'
const DEFAULT_CATEGORY = 'その他'
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

// ===========================================
// 型定義
// ===========================================

interface UnmatchedIngredient {
  normalized_name: string
  count: number
}

interface MasterIngredient {
  id: string
  name: string
}

interface LLMMatchResult {
  input: string
  matchedId: string | null
  isNewIngredient: boolean
  newIngredientCategory?: string
  reason: string
}

interface LLMResponse {
  results: LLMMatchResult[]
}

// ===========================================
// Gemini API
// ===========================================

function buildPrompt(
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

async function callGeminiAPI(
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

// ===========================================
// メイン処理
// ===========================================

Deno.serve(async () => {
  try {
    // 環境変数の取得
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const geminiApiKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase credentials' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Supabase クライアント作成
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 未マッチ食材を取得（出現頻度順）
    console.log(`Fetching unmatched ingredients (limit: ${MAX_ITEMS_PER_RUN})...`)
    const { data: unmatchedData, error: unmatchedError } = await supabase.rpc(
      'get_unmatched_ingredient_counts',
      { limit_count: MAX_ITEMS_PER_RUN }
    )

    if (unmatchedError) {
      throw new Error(`Failed to fetch unmatched: ${unmatchedError.message}`)
    }

    const unmatched = (unmatchedData ?? []) as UnmatchedIngredient[]

    if (unmatched.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No unmatched ingredients', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${unmatched.length} unmatched ingredients`)

    // 2. マスター食材を取得
    const { data: masterData, error: masterError } = await supabase
      .from('ingredients')
      .select('id, name')
      .eq('needs_review', false)

    if (masterError) {
      throw new Error(`Failed to fetch master: ${masterError.message}`)
    }

    const masterIngredients = (masterData ?? []) as MasterIngredient[]
    console.log(`Loaded ${masterIngredients.length} master ingredients`)

    // 3. LLMで判定
    const unmatchedNames = unmatched.map((u) => u.normalized_name)
    console.log('Calling Gemini API for matching...')
    const prompt = buildPrompt(unmatchedNames, masterIngredients)
    const llmResult = await callGeminiAPI(prompt, geminiApiKey)

    if (!llmResult) {
      return new Response(
        JSON.stringify({ error: 'LLM matching failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`LLM returned ${llmResult.results.length} results`)

    // 4. 結果を処理
    let aliasesCreated = 0
    let newIngredientsCreated = 0
    const processedNames: string[] = []
    const errors: string[] = []

    for (const item of llmResult.results) {
      console.log(`Processing: ${item.input} -> ${item.matchedId ?? 'new'} (${item.reason})`)

      if (item.matchedId) {
        // エイリアス登録
        const { error: aliasError } = await supabase
          .from('ingredient_aliases')
          .insert({
            alias: item.input,
            ingredient_id: item.matchedId,
            auto_generated: true,
          })

        if (aliasError) {
          if (aliasError.code === '23505') {
            // 重複エラーは無視
            console.log(`Already exists: ${item.input}`)
          } else {
            errors.push(`Failed to insert alias ${item.input}: ${aliasError.message}`)
            continue
          }
        } else {
          aliasesCreated++
        }
        processedNames.push(item.input)
      } else if (item.isNewIngredient && item.newIngredientCategory) {
        // 新規食材追加
        const category = VALID_CATEGORIES.includes(item.newIngredientCategory)
          ? item.newIngredientCategory
          : DEFAULT_CATEGORY

        const { error: ingredientError } = await supabase
          .from('ingredients')
          .insert({
            name: item.input,
            category,
            needs_review: true,
          })

        if (ingredientError) {
          if (ingredientError.code === '23505') {
            console.log(`Already exists: ${item.input}`)
          } else {
            errors.push(`Failed to insert ingredient ${item.input}: ${ingredientError.message}`)
            continue
          }
        } else {
          newIngredientsCreated++
        }
        processedNames.push(item.input)
      } else {
        // マッチせず、新規追加もしない
        processedNames.push(item.input)
      }
    }

    // 5. 処理済みを削除
    if (processedNames.length > 0) {
      console.log(`Deleting ${processedNames.length} processed items...`)
      const { error: deleteError } = await supabase
        .from('unmatched_ingredients')
        .delete()
        .in('normalized_name', processedNames)

      if (deleteError) {
        errors.push(`Failed to delete processed: ${deleteError.message}`)
      }
    }

    const result = {
      message: 'Auto-alias generation completed',
      processed: llmResult.results.length,
      aliasesCreated,
      newIngredientsCreated,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log('Done:', result)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
