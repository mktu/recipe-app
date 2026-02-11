/**
 * 埋め込み生成 Edge Function
 *
 * pg_cron から定期的に呼び出され、title_embedding が NULL のレシピに
 * 埋め込みベクトルを生成して保存する。
 *
 * リトライ制限:
 *   - embedding_retry_count が MAX_RETRY_COUNT 未満のレシピのみ処理
 *   - 失敗時はリトライ回数をインクリメント
 *
 * 環境変数:
 *   - SUPABASE_URL: 自動設定
 *   - SUPABASE_SERVICE_ROLE_KEY: 自動設定
 *   - GOOGLE_GENERATIVE_AI_API_KEY: 手動で Secrets に設定
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const BATCH_SIZE = 100
const EMBEDDING_MODEL = 'gemini-embedding-001'
const MAX_RETRY_COUNT = 3

interface Recipe {
  id: string
  title: string
  embedding_retry_count: number
}

interface EmbedRequest {
  model: string
  content: { parts: { text: string }[] }
}

interface EmbedResponse {
  embeddings: { values: number[] }[]
}

/**
 * Google Gemini Embedding API を直接呼び出して埋め込みを生成
 */
async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<(number[] | null)[]> {
  if (texts.length === 0) return []

  const requests: EmbedRequest[] = texts.map((text) => ({
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text: text || ' ' }] }, // 空文字対策
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Embedding API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as EmbedResponse
  return data.embeddings.map((e) => e.values)
}

/**
 * 失敗したレシピのリトライ回数をインクリメント
 */
async function incrementRetryCount(
  supabase: ReturnType<typeof createClient>,
  recipeId: string,
  currentCount: number
): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .update({ embedding_retry_count: currentCount + 1 })
    .eq('id', recipeId)

  if (error) {
    console.error(`Failed to increment retry count for ${recipeId}:`, error)
  }
}

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

    // 埋め込みが未生成かつリトライ上限に達していないレシピを取得
    const { data: recipes, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, embedding_retry_count')
      .is('title_embedding', null)
      .lt('embedding_retry_count', MAX_RETRY_COUNT)
      .limit(BATCH_SIZE)

    if (fetchError) {
      throw new Error(`Failed to fetch recipes: ${fetchError.message}`)
    }

    if (!recipes || recipes.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipes to process', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const typedRecipes = recipes as Recipe[]

    // バッチで埋め込み生成（1回の API 呼び出し）
    let embeddings: (number[] | null)[]
    try {
      embeddings = await generateEmbeddings(
        typedRecipes.map((r) => r.title),
        geminiApiKey
      )
    } catch (apiError) {
      // API 全体が失敗した場合、全レシピのリトライ回数をインクリメント
      console.error('Embedding API failed:', apiError)
      for (const recipe of typedRecipes) {
        await incrementRetryCount(supabase, recipe.id, recipe.embedding_retry_count)
      }
      throw apiError
    }

    // 各レシピに埋め込みを保存
    let succeeded = 0
    let failed = 0

    for (let i = 0; i < typedRecipes.length; i++) {
      const recipe = typedRecipes[i]
      const embedding = embeddings[i]

      if (!embedding) {
        // 個別の埋め込み生成が失敗した場合
        await incrementRetryCount(supabase, recipe.id, recipe.embedding_retry_count)
        failed++
        continue
      }

      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          title_embedding: JSON.stringify(embedding),
          embedding_generated_at: new Date().toISOString(),
          embedding_retry_count: 0, // 成功したらリセット
        })
        .eq('id', recipe.id)

      if (updateError) {
        console.error(`Failed to save embedding for ${recipe.id}:`, updateError)
        await incrementRetryCount(supabase, recipe.id, recipe.embedding_retry_count)
        failed++
      } else {
        succeeded++
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Embedding generation completed',
        processed: typedRecipes.length,
        succeeded,
        failed,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
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
