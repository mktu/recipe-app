# セッション引き継ぎ

## 最終更新
2026-02-14 (LIFF認証問題修正・一般公開準備完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **一般公開準備完了**

## 直近の完了タスク
- [x] **Route Groups で公開ページと認証必須ページを分離**
  - `(public)`: `/lp`, `/privacy`, `/terms` - 認証不要
  - `(protected)`: `/`, `/recipes/*` - LINE認証必要
- [x] **LIFFトークン無効時の再ログイン機能追加**
  - トークンが revoked/expired の場合、再ログインボタンを表示
  - `liff.logout()` → `liff.login()` で完全に再認証
  - sessionStorage でリトライ回数を管理（無限ループ防止）
- [x] **LINE Loginチャネルを公開**
  - 「開発中」→「公開済み」に変更
  - 一般ユーザーがLIFFアプリにアクセス可能に

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] **本番環境の埋め込みバッチ処理セットアップ**
  - `docs/EMBEDDING_BATCH_SETUP.md` に沿って設定
- [ ] **LP用スクリーンショット画像の用意**
  - レシピ一覧画面（750×1334px）
  - 食材検索画面（750×1334px）
- [ ] **OGP画像の作成**（1200×630px）
- [ ] **Vercelで `NEXT_PUBLIC_LINE_FRIEND_URL` を設定**（ステージング環境用）
- [ ] **さらなるマッチング改善（任意）**
  - 食材マスター追加: 長芋、小ねぎ、ローズマリー、ミント など

## 将来の改善案（実装保留）
- **検索ログの蓄積** - ユーザーの検索入力を記録して分析に活用
- **埋め込みに食材情報を含める** - タイトル+食材でより精度の高いセマンティック検索

## ブロッカー・注意点
- **LIFF認証:**
  - LINE Loginチャネルは「公開済み」ステータスが必要（開発中だと管理者のみアクセス可能）
  - トークンが無効になった場合は再ログインボタンで対応
  - LIFF SDKには自動トークンリフレッシュ機能がない
- **ベクトル検索閾値:** 0.75 に設定済み（誤検出防止のため）
- **埋め込みバッチ処理:**
  - レシピ登録時は `title_embedding = NULL` で保存される
  - 5分毎に Edge Function が埋め込みを生成
  - JWT 検証は Supabase ダッシュボードから手動で無効化（CLI の既知問題）
- **ローカル埋め込み生成:**
  - `npm run backfill:embeddings` でローカル DB の埋め込みを生成
  - `npm run test:recipe:with-embeddings` でレシピ登録と埋め込み生成をセット実行
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にするとLINEログインなしで動作
- ローカル開発時は `supabase start` で起動が必要
- **RLS注意:** Webhookでは `createServerClient`（Secret Key）を使用すること
- **Gemini API無料枠:**
  - `gemini-2.5-flash` を使用（20 requests/day程度）
  - `gemini-embedding-001` は 1000 RPD
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **GitHub Secrets:** `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` が必要（CI用）
- **ブランチ運用:** `feature/*` → PR → main マージの流れ
- **Botテスト:** `npm run test:bot "メッセージ"` でローカルテスト可能

## コミット履歴（直近）
```
f0ee521 refactor: extract fetchProfileWithRetry to fix max-lines warning
10b7287 feat: add relogin button for token revoked error
06b63b4 fix: prevent infinite login loop with retry limit
e3a095b fix: handle revoked/expired LIFF access token by re-login
1c44287 fix: extract AuthErrorMessage to fix eslint max-lines warning
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/app/(public)/` - 認証不要ページ（LP, privacy, terms）
- `src/app/(protected)/` - 認証必要ページ（ホーム, recipes）
- `src/lib/auth/providers/liff-provider.ts` - LIFF認証プロバイダー（再ログイン機能）
- `src/components/features/home/home-client.tsx` - ホーム画面（認証エラー表示）
- `docs/LINE_SETUP.md` - LINE開発環境構成・リッチメニュー設定
- `docs/EMBEDDING_BATCH_SETUP.md` - 本番環境の埋め込みバッチ処理セットアップ手順
