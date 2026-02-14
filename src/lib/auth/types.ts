/** 認証済みユーザー情報 */
export interface AuthUser {
  /** LINE ユーザー ID */
  lineUserId: string
  /** 表示名 */
  displayName: string
  /** プロフィール画像 URL */
  pictureUrl?: string
}

/** 認証状態 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

/** 認証コンテキストの値 */
export interface AuthContextValue {
  /** 現在のユーザー (未認証時は null) */
  user: AuthUser | null
  /** 認証状態 */
  status: AuthStatus
  /** 認証済みかどうか */
  isAuthenticated: boolean
  /** ローディング中かどうか */
  isLoading: boolean
  /** 認証エラー（デバッグ用） */
  error: string | null
  /** ログアウト処理 */
  logout: () => Promise<void>
  /** 再ログイン処理（トークン無効時用） */
  relogin: () => Promise<void>
}

/** 認証プロバイダーのインターフェース */
export interface AuthProviderAdapter {
  /** 初期化処理 */
  initialize: () => Promise<void>
  /** 現在のユーザーを取得 */
  getUser: () => Promise<AuthUser | null>
  /** ログイン状態を確認 */
  isLoggedIn: () => boolean
  /** ログアウト */
  logout: () => Promise<void>
  /** 再ログイン（トークン無効時用） */
  relogin: () => Promise<void>
}
