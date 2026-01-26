/**
 * レスポンス返却後にバックグラウンドでタスクを実行する
 *
 * - Vercel環境: next/server の after() API を使用（実験的機能）
 * - ローカル環境: Promise.resolve().then() で遅延実行
 *
 * 注意: ローカル開発環境ではレスポンス後にプロセスが終了する可能性があるため、
 * 完全な非同期実行は保証されない。Vercel環境では waitUntil 相当の動作をする。
 */

type AsyncTask = () => Promise<void>

/**
 * レスポンス返却後にタスクを実行する
 *
 * @param task 実行するタスク（async関数）
 *
 * @example
 * ```typescript
 * // API Route内で使用
 * export async function POST(request: NextRequest) {
 *   const data = await saveToDatabase(body)
 *
 *   // レスポンス後にバックグラウンド処理
 *   runAfterResponse(async () => {
 *     await updateSearchIndex(data.id)
 *   })
 *
 *   return NextResponse.json(data) // 即座にレスポンス
 * }
 * ```
 */
export function runAfterResponse(task: AsyncTask): void {
  // Next.js 15+ の after() API を動的にインポート
  // 利用できない環境では Promise.resolve().then() にフォールバック
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { after } = require('next/server')
    if (typeof after === 'function') {
      after(task)
      return
    }
  } catch {
    // after() が利用できない環境
  }

  // フォールバック: 非同期で実行（レスポンスをブロックしない）
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error('[runAfterResponse] Background task failed:', error)
    })
}
