import { embed, embedMany } from 'ai'
import { geminiEmbedding } from './client'

/**
 * 単一テキストの埋め込みベクトルを生成
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: geminiEmbedding,
    value: text,
  })
  return embedding
}

/**
 * 複数テキストの埋め込みベクトルを一括生成（バッチ処理用）
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const { embeddings } = await embedMany({
    model: geminiEmbedding,
    values: texts,
  })
  return embeddings
}
