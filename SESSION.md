# セッションダッシュボード

> **進捗・完了タスクの履歴はここに書かない。** それらは GitHub Issues / PR / commit で管理する。
> このファイルの役割は2つだけ:
> 1. 新しい AI セッション立ち上げ時に**現在地を一目で把握**する
> 2. **Issue に紐づかない横断的な注意点（環境・運用の gotcha）**を残す

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 進行中・次にやること
未完了タスクの正本は GitHub Issues（`gh issue list --state open`）。ここには方針レベルの塊だけ:

- **公開・宣伝** — #109 技術記事、#132 Gemini 有料 tier 判断
- **保守・リファクタ** — #106 API コールの typed 関数集約、#48 画像ホットリンク→next/image プロキシ、#37〜#39 E2E テスト、#110 RLS 実効化（defense-in-depth・優先度低）
- **パッケージアップデート継続**（`/update-packages`）— G3 AI SDK / G4 UI(`lucide-react` major) / G6 開発ツール(`typescript`6, `eslint`10 等 major 多数) / G7 その他(`zod`, `schema-dts`2)

## Issue 化しづらい手動メモ
- **CLAUDE.md L17 の Scraper 記述を修正**（「Jina Reader API」→ 実装は `__NEXT_DATA__` 抽出。ARCHITECTURE.md 側は整合済み）
- **Vercel Dashboard で Node.js を 24.x に設定**（Settings → Build & Development Settings → Node.js Version）

## 横断的な注意点（環境・運用の gotcha）
- **PR は必ず `--base develop`**（`/create-pr` を使うと安全）。過去に main へ誤マージあり（PR #95）
- **Vercel Preview の Deployment Protection は Off**（staging の LINE Webhook を通すため）
- **staging LINE Webhook URL**: `https://recipe-app-git-develop-mktus-projects.vercel.app/api/webhook/line`
- **ローカルでのレシピ取得**: `supabase functions serve` を別ターミナルで起動が必要
- **ローカルはアカウント削除不可**（DevAuthProvider の getAccessToken が null）
- **ローカルでレシピ追加には `dev-user-001` の users 行が必要**（`supabase/seed.sql`）。無いと create 失敗 → `npx supabase db reset` で seed 再投入
- **API は ID トークン検証必須**（dev は `NEXT_PUBLIC_LIFF_ID` 空でバイパス）。クライアントからの呼び出しは `useAuthedFetch` を使う
- **Supabase キー**: アプリ全体は `SUPABASE_SECRET_KEY`（`sb_secret_...`）、Edge Functions 内部は `SUPABASE_SERVICE_ROLE_KEY`（自動インジェクト）
- **fnm の PATH**: ターミナル起動時に `eval "$(fnm env --use-on-cd --shell zsh)"` が必要
- **本番/staging で `NEXT_PUBLIC_APP_URL` 設定必須**（未設定だと LINE トーク上の規約・プライバシーリンクが機能しない）

## 主要な参照ポインタ（非自明なものだけ）
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・API構成（実装の正本）
- `docs/DATABASE_DESIGN.md` - DB設計
- `docs/SCRAPING_POLICY.md` - スクレイピング方針・規約確認記録の正本
- `src/lib/recipe/parse-recipe.ts` - 解析フロー（JSON-LD → __NEXT_DATA__ → OGP → 空結果）
- `src/lib/auth/verify-line-token.ts` / `src/lib/api/auth-guard.ts` - ID トークン検証・API 認証ガード
- `supabase/migrations/20260702000000_clarify_rls_policies.sql` - RLS（service_role ベース・設計意図をコメント記載）
- `.claude/skills/legal-check/skill.md` - 法的リスクチェック（Issue 一元化・線引き基準）

## GitHub リポジトリ
https://github.com/mktu/recipe-app
