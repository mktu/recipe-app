/**
 * LINE ID トークンを `Authorization: Bearer` ヘッダに付与して fetch するヘルパー。
 *
 * idToken は `useAuth().getIdToken()` で取得して渡す。
 * dev モードでは null になるが、その場合ヘッダは付与されず、
 * サーバー側の検証が dev バイパスで通る（verify-line-token.ts 参照）。
 */
export function authedFetch(
  idToken: string | null,
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers)
  if (idToken) {
    headers.set('Authorization', `Bearer ${idToken}`)
  }
  return fetch(input, { ...init, headers })
}
