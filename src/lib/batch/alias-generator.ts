/**
 * 食材エイリアス自動生成バッチ処理
 *
 * 未マッチ食材をLLMで判定し、エイリアス登録または新規食材追加を行う
 * ADR-001: 食材マッチングの表記揺れ対応
 */

import { generateText, Output } from 'ai'
import { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { geminiFlash } from '@/lib/llm/gemini-client'
import type { Database } from '@/types/database'

type TypedSupabaseClient = SupabaseClient<Database>

/** 処理上限 */
const MAX_ITEMS_PER_RUN = 100

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

/** LLMの判定結果スキーマ */
const aliasMatchResultSchema = z.object({
  results: z.array(
    z.object({
      input: z.string().describe('入力された食材名'),
      matchedId: z
        .string()
        .nullable()
        .describe('マッチしたマスター食材のID。マッチしない場合はnull'),
      isNewIngredient: z
        .boolean()
        .describe('新規食材として追加すべきかどうか'),
      newIngredientCategory: z
        .string()
        .optional()
        .describe('新規食材の場合のカテゴリ'),
      reason: z.string().describe('判定理由'),
    })
  ),
})

type AliasMatchResult = z.infer<typeof aliasMatchResultSchema>

export interface GenerateAliasesResult {
  processed: number
  aliasesCreated: number
  newIngredientsCreated: number
  errors: string[]
}

// ===========================================
// DB操作
// ===========================================

/**
 * 未マッチ食材を出現頻度順で取得
 */
async function fetchUnmatchedIngredients(
  supabase: TypedSupabaseClient,
  limit: number
): Promise<UnmatchedIngredient[]> {
  // normalized_nameでグループ化し、出現回数でソート
  const { data, error } = await supabase.rpc('get_unmatched_ingredient_counts', {
    limit_count: limit,
  })

  if (error) {
    console.error('[fetchUnmatchedIngredients] Error:', error)
    return []
  }

  return (data ?? []) as UnmatchedIngredient[]
}

/**
 * マスター食材一覧を取得
 */
async function fetchMasterIngredients(
  supabase: TypedSupabaseClient
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

/**
 * エイリアスを登録
 */
async function insertAlias(
  supabase: TypedSupabaseClient,
  alias: string,
  ingredientId: string
): Promise<boolean> {
  const { error } = await supabase.from('ingredient_aliases').insert({
    alias,
    ingredient_id: ingredientId,
    auto_generated: true,
  })

  if (error) {
    // 重複エラーは無視
    if (error.code === '23505') {
      console.log(`[insertAlias] Already exists: ${alias}`)
      return true
    }
    console.error('[insertAlias] Error:', error)
    return false
  }

  return true
}

/**
 * 新規食材を追加（要レビュー）
 */
async function insertNewIngredient(
  supabase: TypedSupabaseClient,
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
    // 重複エラーは無視
    if (error.code === '23505') {
      console.log(`[insertNewIngredient] Already exists: ${name}`)
      return null
    }
    console.error('[insertNewIngredient] Error:', error)
    return null
  }

  return data?.id ?? null
}

/**
 * 処理済みの未マッチ食材を削除
 */
async function deleteProcessedUnmatched(
  supabase: TypedSupabaseClient,
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
// LLM判定
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

## 出力
各食材について以下を判定してください：
- matchedId: マッチするマスター食材のID（マッチしない場合はnull）
- isNewIngredient: 新規食材として追加すべきか
- newIngredientCategory: 新規食材の場合のカテゴリ（${VALID_CATEGORIES.join(', ')}）
- reason: 判定理由（簡潔に）`
}

async function matchWithLLM(
  unmatchedNames: string[],
  masterIngredients: MasterIngredient[]
): Promise<AliasMatchResult | null> {
  if (unmatchedNames.length === 0) return null

  const prompt = buildPrompt(unmatchedNames, masterIngredients)

  try {
    const { output } = await generateText({
      model: geminiFlash,
      output: Output.object({ schema: aliasMatchResultSchema }),
      prompt,
    })

    return output ?? null
  } catch (error) {
    console.error('[matchWithLLM] Error:', error)
    return null
  }
}

// ===========================================
// メイン処理
// ===========================================

/**
 * エイリアス自動生成のメイン処理
 */
export async function generateAliases(
  supabase: TypedSupabaseClient,
  options: { limit?: number; dryRun?: boolean } = {}
): Promise<GenerateAliasesResult> {
  const { limit = MAX_ITEMS_PER_RUN, dryRun = false } = options

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
  console.log('[generateAliases] Calling LLM for matching...')
  const llmResult = await matchWithLLM(unmatchedNames, masterIngredients)

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
      // エイリアス登録
      const success = await insertAlias(supabase, item.input, item.matchedId)
      if (success) {
        result.aliasesCreated++
        processedNames.push(item.input)
      } else {
        result.errors.push(`Failed to insert alias: ${item.input}`)
      }
    } else if (item.isNewIngredient && item.newIngredientCategory) {
      // 新規食材追加
      const newId = await insertNewIngredient(
        supabase,
        item.input,
        item.newIngredientCategory
      )
      if (newId) {
        result.newIngredientsCreated++
        processedNames.push(item.input)
      } else {
        // 既に存在する場合も処理済みとする
        processedNames.push(item.input)
      }
    } else {
      // マッチせず、新規追加もしない（調味料等）
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
