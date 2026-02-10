import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { generateEmbedding } from '@/lib/embedding/generate'

type TypedSupabaseClient = SupabaseClient<Database>

export interface VectorSearchResult {
  id: string
  title: string
  url: string
  image_url: string | null
  source_name: string | null
  memo: string | null
  similarity: number
}

/**
 * レシピの埋め込みベクトルを生成して保存
 */
export async function generateAndSaveEmbedding(
  client: TypedSupabaseClient,
  recipeId: string,
  title: string
): Promise<void> {
  try {
    const embedding = await generateEmbedding(title)
    await saveRecipeEmbedding(client, recipeId, embedding)
  } catch (error) {
    // 埋め込み生成失敗はレシピ保存の失敗とはしない
    console.error('[generateAndSaveEmbedding] Error:', error)
  }
}

/**
 * 埋め込みベクトルをDBに保存
 */
export async function saveRecipeEmbedding(
  client: TypedSupabaseClient,
  recipeId: string,
  embedding: number[]
): Promise<void> {
  const { error } = await client
    .from('recipes')
    .update({
      title_embedding: JSON.stringify(embedding),
      embedding_generated_at: new Date().toISOString(),
    })
    .eq('id', recipeId)

  if (error) {
    console.error('[saveRecipeEmbedding] Error:', error)
    throw error
  }
}

/**
 * ベクトル類似検索を実行
 */
export async function searchRecipesByEmbedding(
  client: TypedSupabaseClient,
  userId: string,
  queryEmbedding: number[],
  threshold: number = 0.5,
  limit: number = 20
): Promise<VectorSearchResult[]> {
  const { data, error } = await client.rpc('search_recipes_by_embedding', {
    p_user_id: userId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_threshold: threshold,
    p_match_count: limit,
  })

  if (error) {
    console.error('[searchRecipesByEmbedding] Error:', error)
    throw error
  }

  return (data ?? []) as VectorSearchResult[]
}

/**
 * 埋め込み未生成のレシピを取得（バックフィル用）
 */
export async function getRecipesWithoutEmbedding(
  client: TypedSupabaseClient,
  limit: number = 100
): Promise<{ id: string; title: string }[]> {
  const { data, error } = await client
    .from('recipes')
    .select('id, title')
    .is('title_embedding', null)
    .limit(limit)

  if (error) throw error
  return (data ?? []) as { id: string; title: string }[]
}

// ハイブリッド検索の設定
const VECTOR_SEARCH_THRESHOLD = 0.65

/**
 * ベクトル検索で追加のレシピIDを取得
 */
export async function getVectorSearchIds(
  client: TypedSupabaseClient,
  userId: string,
  searchQuery: string,
  excludeIds: string[],
  limit: number
): Promise<string[]> {
  const queryEmbedding = await generateEmbedding(searchQuery)
  const vectorResults = await searchRecipesByEmbedding(
    client, userId, queryEmbedding, VECTOR_SEARCH_THRESHOLD, limit
  )
  const excludeSet = new Set(excludeIds)
  return vectorResults.filter((r) => !excludeSet.has(r.id)).map((r) => r.id)
}
