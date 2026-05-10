import { NextResponse } from 'next/server'

/**
 * 500 エラーレスポンスを返す共通ヘルパー
 * - クライアントには汎用メッセージのみ返す
 * - 詳細はサーバーログに記録する
 */
export function apiServerError(error: unknown, context: string): NextResponse {
  console.error(`[${context}] Error:`, error)
  return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 })
}
