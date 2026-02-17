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
import {
  fetchUnmatchedIngredients,
  fetchMasterIngredients,
  insertAlias,
  insertNewIngredient,
  deleteProcessedUnmatched,
} from './alias-db.ts'
import { buildPrompt, callGeminiAPI, LLMMatchResult } from './alias-llm.ts'

const DEFAULT_LIMIT = 100

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

interface ProcessItemResult {
  aliasCreated: boolean
  newIngredientCreated: boolean
  error: string | null
}

async function processMatchedItem(
  supabase: SupabaseClient,
  item: LLMMatchResult,
  dryRun: boolean
): Promise<ProcessItemResult> {
  if (dryRun || !item.matchedId) {
    return { aliasCreated: false, newIngredientCreated: false, error: null }
  }

  const success = await insertAlias(supabase, item.input, item.matchedId)
  return {
    aliasCreated: success,
    newIngredientCreated: false,
    error: success ? null : `Failed to insert alias: ${item.input}`,
  }
}

async function processNewIngredientItem(
  supabase: SupabaseClient,
  item: LLMMatchResult,
  dryRun: boolean
): Promise<ProcessItemResult> {
  if (dryRun || !item.newIngredientCategory) {
    return { aliasCreated: false, newIngredientCreated: false, error: null }
  }

  const newId = await insertNewIngredient(supabase, item.input, item.newIngredientCategory)
  return {
    aliasCreated: false,
    newIngredientCreated: newId !== null,
    error: null,
  }
}

async function processLLMResult(
  supabase: SupabaseClient,
  item: LLMMatchResult,
  dryRun: boolean
): Promise<ProcessItemResult> {
  console.log(
    `[generateAliases] Processing: ${item.input} -> ${item.matchedId ?? 'new'} (${item.reason})`
  )

  if (item.matchedId) {
    return processMatchedItem(supabase, item, dryRun)
  }

  if (item.isNewIngredient) {
    return processNewIngredientItem(supabase, item, dryRun)
  }

  return { aliasCreated: false, newIngredientCreated: false, error: null }
}

function aggregateResult(
  result: GenerateAliasesResult,
  itemResult: ProcessItemResult
): void {
  if (itemResult.aliasCreated) result.aliasesCreated++
  if (itemResult.newIngredientCreated) result.newIngredientsCreated++
  if (itemResult.error) result.errors.push(itemResult.error)
  result.processed++
}

async function processAllResults(
  supabase: SupabaseClient,
  items: LLMMatchResult[],
  dryRun: boolean,
  result: GenerateAliasesResult
): Promise<string[]> {
  const processedNames: string[] = []
  for (const item of items) {
    const itemResult = await processLLMResult(supabase, item, dryRun)
    aggregateResult(result, itemResult)
    processedNames.push(item.input)
  }
  return processedNames
}

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

  // 1. データ取得
  console.log(`[generateAliases] Fetching unmatched ingredients (limit: ${limit})...`)
  const unmatched = await fetchUnmatchedIngredients(supabase, limit)
  if (unmatched.length === 0) {
    console.log('[generateAliases] No unmatched ingredients found')
    return result
  }
  console.log(`[generateAliases] Found ${unmatched.length} unmatched ingredients`)

  const masterIngredients = await fetchMasterIngredients(supabase)
  console.log(`[generateAliases] Loaded ${masterIngredients.length} master ingredients`)

  // 2. LLMで判定
  const unmatchedNames = unmatched.map((u) => u.normalized_name)
  console.log('[generateAliases] Calling Gemini API...')
  const llmResult = await callGeminiAPI(buildPrompt(unmatchedNames, masterIngredients), geminiApiKey)
  if (!llmResult) {
    result.errors.push('LLM matching failed')
    return result
  }
  console.log(`[generateAliases] LLM returned ${llmResult.results.length} results`)

  // 3. 結果を処理
  const processedNames = await processAllResults(supabase, llmResult.results, dryRun, result)

  // 4. 処理済みを削除
  if (!dryRun) {
    console.log(`[generateAliases] Deleting ${processedNames.length} processed items...`)
    await deleteProcessedUnmatched(supabase, processedNames)
  }

  console.log('[generateAliases] Done:', result)
  return result
}
