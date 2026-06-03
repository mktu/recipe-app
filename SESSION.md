# セッション引き継ぎ

## 最終更新
2026-06-03 (Issue #86 アカウント削除機能 develop → main マージ完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 直近の完了タスク
- [x] **#86 ユーザーが自己でアカウント削除できる機能を実装（PR #95→develop反映済み）**
  - `DELETE /api/auth/delete-user` エンドポイント追加
  - LINE deauthorize API 呼び出し（チャンネルアクセストークン + userAccessToken）
  - `/settings` ページ + アカウント削除ダイアログ実装
  - ホームヘッダーに設定アイコン追加
  - `AuthProviderAdapter` に `getAccessToken()` を追加
  - unfollow イベントでの DB 削除は廃止（ブロック ≠ データ削除意思）
  - 退会キーワード（「退会」等）で設定画面への誘導メッセージを追加
  - NEXT_PUBLIC_LIFF_ID からチャンネル ID を抽出、LINE_LOGIN_CHANNEL_SECRET を新規追加
- [x] **`/create-pr` スキルを追加**（--base develop 強制、ベースブランチをユーザーに確認）
- [x] **#80 #81 #82 プライバシーポリシーを実態に合わせて修正（PR #93）**
- [x] **#78 User-AgentをBot識別可能な値に変更（PR #91）**

## 進行中のタスク
なし

## 次にやること（GitHub Issues で管理）
- [ ] **develop → main PR を作成して本番リリース**（#86 アカウント削除機能を本番反映）
  - Vercel 本番環境に `LINE_LOGIN_CHANNEL_SECRET` の設定が必要
- [ ] **Vercel Dashboard で Node.js バージョンを 24.x に設定**（手動作業）
  - Settings → Build & Development Settings → Node.js Version → 24.x
- [ ] **パッケージアップデートの継続**（スキップした項目）
  - `@supabase/supabase-js`: 2.106.0（patch）
  - `@types/node`: 24 → 25（major、影響調査が必要）
  - G3: AI SDK（`ai` 6.0.48→6.0.184、`@ai-sdk/google` 3.0.13→3.0.75）
  - G4: UI / スタイリング（`lucide-react` major あり要注意）
  - G6: 開発ツール（`typescript` 5→6、`eslint` 9→10、`lint-staged` 16→17 など major 多数）
  - G7: その他（`swr`、`zod`、`schema-dts` 1→2 major）
- [ ] **#37〜#39: E2E テスト**

## ブロッカー・注意点
- **本番リリース前に Vercel 本番環境へ `LINE_LOGIN_CHANNEL_SECRET` を設定すること**
  - LINE Developers Console → LINE Login チャンネル → Basic settings → Channel secret
- **PR は必ず `--base develop` を指定する**（`/create-pr` スキルを使うと安全）
  - 過去に `main` へ誤マージした実績あり（PR #95）
- **Vercel Preview の Deployment Protection は Off にしている**
  - staging の LINE Webhook を通すために必要
- **staging LINE チャネルの Webhook URL**
  - `https://recipe-app-git-develop-mktus-projects.vercel.app/api/webhook/line`
- **ローカル開発でのレシピ取得:** `supabase functions serve` を別ターミナルで起動する必要あり
- **ローカルではアカウント削除不可**（DevAuthProvider は getAccessToken が null を返すため）
- **Supabase キー:**
  - `SUPABASE_SECRET_KEY`（`sb_secret_...` 形式）を全体で統一使用
  - Edge Functions 内部は `SUPABASE_SERVICE_ROLE_KEY`（Supabase 自動インジェクト）を使用
- **fnm の PATH:** ターミナル起動時に `eval "$(fnm env --use-on-cd --shell zsh)"` が必要

## 参照すべきファイル
- `CLAUDE.md` - プロジェクトガイド
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・API構成
- `docs/DATABASE_DESIGN.md` - DB設計
- `src/app/api/auth/delete-user/route.ts` - アカウント削除API
- `src/components/features/settings/account-delete-section.tsx` - 削除UI
- `src/lib/auth/types.ts` - AuthProviderAdapter（getAccessToken追加済み）
- `.claude/skills/create-pr/SKILL.md` - PR作成スキル

## コミット履歴（直近）
```
13a5ff0 fix: LINE Login チャンネル ID を NEXT_PUBLIC_LIFF_ID から取得
50cb8ef fix: deauthorize API の呼び出し方を公式仕様に修正
67742c6 fix: deauthorize リクエストに空ボディを追加
98a4985 fix: deauthorize リクエストに Content-Type ヘッダーを追加
2cc4bc5 feat: 退会時に LINE deauthorize API を呼び出す（Issue #86）
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app
