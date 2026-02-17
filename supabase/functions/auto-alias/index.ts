/**
 * 食材エイリアス自動生成 Edge Function
 *
 * pg_cron から1日1回呼び出され、未マッチ食材をLLMで判定し
 * エイリアス登録または新規食材追加を行う。
 *
 * 非同期パターン:
 * - すぐにレスポンスを返す（cronタイムアウト回避）
 * - バックグラウンドで処理を継続
 *
 * ADR-001: 食材マッチングの表記揺れ対応
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
// バックグラウンド処理
// ===========================================

async function processAliases(
  supabaseUrl: string,
  supabaseKey: string,
  geminiApiKey: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log(`[auto-alias] Starting background process...`)

  // 1. 未マッチ食材を取得
  const { data: unmatchedData, error: unmatchedError } = await supabase.rpc(
    'get_unmatched_ingredient_counts',
    { limit_count: MAX_ITEMS_PER_RUN }
  )

  if (unmatchedError) {
    console.error(`[auto-alias] Failed to fetch unmatched: ${unmatchedError.message}`)
    return
  }

  const unmatched = (unmatchedData ?? []) as UnmatchedIngredient[]

  if (unmatched.length === 0) {
    console.log('[auto-alias] No unmatched ingredients')
    return
  }

  console.log(`[auto-alias] Found ${unmatched.length} unmatched ingredients`)

  // 2. マスター食材を取得
  const { data: masterData, error: masterError } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('needs_review', false)

  if (masterError) {
    console.error(`[auto-alias] Failed to fetch master: ${masterError.message}`)
    return
  }

  const masterIngredients = (masterData ?? []) as MasterIngredient[]
  console.log(`[auto-alias] Loaded ${masterIngredients.length} master ingredients`)

  // 3. LLMで判定
  const unmatchedNames = unmatched.map((u) => u.normalized_name)
  console.log('[auto-alias] Calling Gemini API...')
  const prompt = buildPrompt(unmatchedNames, masterIngredients)
  const llmResult = await callGeminiAPI(prompt, geminiApiKey)

  if (!llmResult) {
    console.error('[auto-alias] LLM matching failed')
    return
  }

  console.log(`[auto-alias] LLM returned ${llmResult.results.length} results`)

  // 4. 結果を処理
  let aliasesCreated = 0
  let newIngredientsCreated = 0
  const processedNames: string[] = []

  for (const item of llmResult.results) {
    console.log(`[auto-alias] Processing: ${item.input} -> ${item.matchedId ?? 'new'}`)

    if (item.matchedId) {
      const { error } = await supabase.from('ingredient_aliases').insert({
        alias: item.input,
        ingredient_id: item.matchedId,
        auto_generated: true,
      })

      if (!error) {
        aliasesCreated++
      } else if (error.code !== '23505') {
        console.error(`[auto-alias] Insert alias error: ${error.message}`)
      }
      processedNames.push(item.input)
    } else if (item.isNewIngredient && item.newIngredientCategory) {
      const category = VALID_CATEGORIES.includes(item.newIngredientCategory)
        ? item.newIngredientCategory
        : DEFAULT_CATEGORY

      const { error } = await supabase.from('ingredients').insert({
        name: item.input,
        category,
        needs_review: true,
      })

      if (!error) {
        newIngredientsCreated++
      } else if (error.code !== '23505') {
        console.error(`[auto-alias] Insert ingredient error: ${error.message}`)
      }
      processedNames.push(item.input)
    } else {
      processedNames.push(item.input)
    }
  }

  // 5. 処理済みを削除
  if (processedNames.length > 0) {
    const { error } = await supabase
      .from('unmatched_ingredients')
      .delete()
      .in('normalized_name', processedNames)

    if (error) {
      console.error(`[auto-alias] Delete error: ${error.message}`)
    }
  }

  console.log(`[auto-alias] Done: aliases=${aliasesCreated}, new=${newIngredientsCreated}`)
}

// ===========================================
// メイン（非同期パターン）
// ===========================================

Deno.serve(async () => {
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

  // バックグラウンドで処理開始（awaitしない）
  processAliases(supabaseUrl, supabaseKey, geminiApiKey).catch((err) => {
    console.error('[auto-alias] Background process error:', err)
  })

  // すぐにレスポンスを返す（cronタイムアウト回避）
  return new Response(
    JSON.stringify({ status: 'accepted', message: 'Processing started in background' }),
    { status: 202, headers: { 'Content-Type': 'application/json' } }
  )
})
