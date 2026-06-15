import { NextRequest, NextResponse } from 'next/server'
import { verifyLineToken } from '@/lib/auth/verify-line-token'

/**
 * `Authorization: Bearer <idToken>` ヘッダから ID トークンを取り出す。
 */
function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

/**
 * リクエストの ID トークンを検証し、検証済み lineUserId を返す。
 *
 * 各 API route の冒頭で呼び出す。戻り値が NextResponse の場合は
 * 認証失敗なので即 return すること。文字列なら検証済み lineUserId。
 * body / ヘッダの自己申告 lineUserId は信用せず、この戻り値のみを使う。
 *
 * 使用例:
 * ```ts
 * const auth = await requireLineUser(request)
 * if (auth instanceof NextResponse) return auth
 * const lineUserId = auth
 * ```
 */
export async function requireLineUser(request: NextRequest): Promise<string | NextResponse> {
  const idToken = extractBearerToken(request)
  const lineUserId = await verifyLineToken(idToken)

  if (!lineUserId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  return lineUserId
}
