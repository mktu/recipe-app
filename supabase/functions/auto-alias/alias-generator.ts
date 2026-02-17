// THIS FILE IS AUTO-GENERATED - DO NOT EDIT DIRECTLY
// Source: src/lib/batch/alias-generator.ts
// Run: npx tsx scripts/build-edge-functions.ts

/**
 * 食材エイリアス自動生成バッチ処理
 *
 * 未マッチ食材をLLMで判定し、エイリアス登録または新規食材追加を行う
 * ADR-001: 食材マッチングの表記揺れ対応
 *
 * Deno/Node.js 両対応（fetch API ベース）
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** 処理上限 */
const DEFAULT_LIMIT = 100

/** カテゴリのデフォルト値 */
const DEFAULT_CATEGORY = 'その他'

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

export interface GenerateAliasesResult {
  processed: number
  aliasesCreated: number
  newIngredientsCreated: number
  errors: string[]
}

export interface GenerateAliasesOptions {
  limit?: number
  dryRun?: boolean
  geminiApiKey: string
}

// ===========================================
// Gemini API（fetch ベース）
// ===========================================

const GEMINI_MODEL = 'gemini-2.5-flash'

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
// DB操作
// ===========================================

async function fetchUnmatchedIngredients(
  supabase: SupabaseClient,
  limit: number
): Promise<UnmatchedIngredient[]> {
  const { data, error } = await supabase.rpc('get_unmatched_ingredient_counts', {
    limit_count: limit,
  })

  if (error) {
    console.error('[fetchUnmatchedIngredients] Error:', error)
    return []
  }

  return (data ?? []) as UnmatchedIngredient[]
}

async function fetchMasterIngredients(
  supabase: SupabaseClient
): Promise<MasterIngredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name')
    .eq('needs_review', false)

  if (error) {
    console.error('[fetchMasterIngredients] Error:', error)
    return []
  }

  return (data ?? []) as MasterIngredient[]
}

async function insertAlias(
  supabase: SupabaseClient,
  alias: string,
  ingredientId: string
): Promise<boolean> {
  const { error } = await supabase.from('ingredient_aliases').insert({
    alias,
    ingredient_id: ingredientId,
    auto_generated: true,
  })

  if (error) {
    if (error.code === '23505') {
      console.log(`[insertAlias] Already exists: ${alias}`)
      return true
    }
    console.error('[insertAlias] Error:', error)
    return false
  }

  return true
}

async function insertNewIngredient(
  supabase: SupabaseClient,
  name: string,
  category: string
): Promise<string | null> {
  const validCategory = VALID_CATEGORIES.includes(category)
    ? category
    : DEFAULT_CATEGORY

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      name,
      category: validCategory,
      needs_review: true,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      console.log(`[insertNewIngredient] Already exists: ${name}`)
      return null
    }
    console.error('[insertNewIngredient] Error:', error)
    return null
  }

  return data?.id ?? null
}

async function deleteProcessedUnmatched(
  supabase: SupabaseClient,
  normalizedNames: string[]
): Promise<void> {
  if (normalizedNames.length === 0) return

  const { error } = await supabase
    .from('unmatched_ingredients')
    .delete()
    .in('normalized_name', normalizedNames)

  if (error) {
    console.error('[deleteProcessedUnmatched] Error:', error)
  }
}

// ===========================================
// メイン処理
// ===========================================

export async function generateAliases(
  supabase: SupabaseClient,
  options: GenerateAliasesOptions
): Promise<GenerateAliasesResult> {
  const { limit = DEFAULT_LIMIT, dryRun = false, geminiApiKey } = options

  const result: GenerateAliasesResult = {
    processed: 0,
    aliasesCreated: 0,
    newIngredientsCreated: 0,
    errors: [],
  }

  // 1. 未マッチ食材を取得
  console.log(`[generateAliases] Fetching unmatched ingredients (limit: ${limit})...`)
  const unmatched = await fetchUnmatchedIngredients(supabase, limit)

  if (unmatched.length === 0) {
    console.log('[generateAliases] No unmatched ingredients found')
    return result
  }

  console.log(`[generateAliases] Found ${unmatched.length} unmatched ingredients`)

  // 2. マスター食材を取得
  const masterIngredients = await fetchMasterIngredients(supabase)
  console.log(`[generateAliases] Loaded ${masterIngredients.length} master ingredients`)

  // 3. LLMで判定
  const unmatchedNames = unmatched.map((u) => u.normalized_name)
  console.log('[generateAliases] Calling Gemini API...')
  const prompt = buildPrompt(unmatchedNames, masterIngredients)
  const llmResult = await callGeminiAPI(prompt, geminiApiKey)

  if (!llmResult) {
    result.errors.push('LLM matching failed')
    return result
  }

  console.log(`[generateAliases] LLM returned ${llmResult.results.length} results`)

  // 4. 結果を処理
  const processedNames: string[] = []

  for (const item of llmResult.results) {
    console.log(
      `[generateAliases] Processing: ${item.input} -> ${item.matchedId ?? 'new'} (${item.reason})`
    )

    if (dryRun) {
      processedNames.push(item.input)
      result.processed++
      continue
    }

    if (item.matchedId) {
      const success = await insertAlias(supabase, item.input, item.matchedId)
      if (success) {
        result.aliasesCreated++
      } else {
        result.errors.push(`Failed to insert alias: ${item.input}`)
      }
      processedNames.push(item.input)
    } else if (item.isNewIngredient && item.newIngredientCategory) {
      const newId = await insertNewIngredient(
        supabase,
        item.input,
        item.newIngredientCategory
      )
      if (newId) {
        result.newIngredientsCreated++
      }
      processedNames.push(item.input)
    } else {
      processedNames.push(item.input)
    }

    result.processed++
  }

  // 5. 処理済みを削除
  if (!dryRun && processedNames.length > 0) {
    console.log(`[generateAliases] Deleting ${processedNames.length} processed items...`)
    await deleteProcessedUnmatched(supabase, processedNames)
  }

  console.log('[generateAliases] Done:', result)
  return result
}
