import type { AuthUser } from './types'

/** 開発環境用のダミーユーザー */
export const DEV_USER: AuthUser = {
  lineUserId: 'dev-user-001',
  displayName: '開発ユーザー',
  pictureUrl: undefined,
}
