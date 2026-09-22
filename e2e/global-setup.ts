/**
 * E2E の前提チェック。
 *
 * ホーム一覧は `get-recipes` Edge Function を通るので、Edge Runtime が死んでいると
 * 一覧が常に空になる。`/api/recipes/list` は 500 を返すが、ホーム画面がその
 * エラーを捨てていた頃は「レシピがまだ保存されていません」に見えたため、**詳細・削除
 * だけでなくレシピ追加フローのテストまで一斉に落ちた**。しかも落ち方が「保存したのに
 * 一覧に出ない」なので、自分の変更が壊したようにしか見えない。
 *
 * とくに踏みやすいのが、worktree から `npm run functions:serve` した後にその worktree を
 * 消したケース。コンテナは生きたまま存在しないパスを参照し続ける
 * （`docs/SUPABASE_LOCAL.md`）。ここで先に検出して、原因を名指しして落とす。
 */

const SUPABASE_URL = 'http://localhost:54321'
const PROBE_URL = `${SUPABASE_URL}/functions/v1/get-recipes`

/** コンテナ再作成直後は gateway が解決できず 503 を返すので、少し待つ */
const TIMEOUT_MS = 30_000
const INTERVAL_MS = 1_000

const HINT = `
  Edge Runtime を立て直してください（メインのチェックアウトで実行する）:

    npm run functions:build   # 生成物は gitignore なので worktree 側には無い
    npm run functions:serve

  掴んでいるパスの確認:

    docker inspect supabase_edge_runtime_recipe-app --format '{{range .Mounts}}{{.Source}}{{"\\n"}}{{end}}'
`

/** worker の boot 自体が失敗している印。待っても直らないので即座に諦める */
function isBootFailure(body: string) {
  return body.includes('Module not found') || body.includes('boot error')
}

/** OPTIONS は認証不要で 200 'ok' を返すが、worker の boot は必要なので probe に使える */
async function probe(): Promise<{ ok: boolean; detail: string; fatal: boolean }> {
  try {
    const response = await fetch(PROBE_URL, { method: 'OPTIONS' })
    if (response.ok) return { ok: true, detail: '', fatal: false }

    const body = await response.text().catch(() => '')
    return {
      ok: false,
      detail: `${response.status}${body ? ` ${body.trim()}` : ''}`,
      fatal: isBootFailure(body),
    }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      fatal: false,
    }
  }
}

async function assertGetRecipesIsServed() {
  const deadline = Date.now() + TIMEOUT_MS
  let last = await probe()

  while (!last.ok && !last.fatal && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS))
    last = await probe()
  }

  if (last.ok) return

  throw new Error(
    `Edge Function get-recipes が応答しません（${PROBE_URL}）。\n  ${last.detail}\n${HINT}`
  )
}

export default async function globalSetup() {
  await assertGetRecipesIsServed()
}
