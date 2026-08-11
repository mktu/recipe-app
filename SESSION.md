# セッションダッシュボード

> **進捗・完了タスクの履歴はここに書かない。** それらは GitHub Issues / PR / commit で管理する。
> このファイルの役割は2つだけ:
> 1. 新しい AI セッション立ち上げ時に**現在地を一目で把握**する
> 2. **Issue に紐づかない横断的な注意点（環境・運用の gotcha）**を残す

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **本番稼働中**

## 進行中・次にやること
未完了タスクの正本は GitHub Issues（`gh issue list --state open`）。ここには方針レベルの塊だけ:

- **公開・宣伝** — #132 Gemini 有料 tier 判断
- **食材マッチングの積み残し**（#144 の検討中に判明。#148 は完了。着手順は #147 → #152 → #150 → #149 が素直）— #147 エイリアス生成後にレシピが再リンクされない、#152 正規化が切り方・「、」連結を処理せずゴミ食材がマスタに流入する（#148 で自動追加食材を即時有効化したため、今後ゴミが UI に直接出る）、#150 自動追加食材の週次 LINE 通知による事後監査、#149 ARCHITECTURE.md の auto-alias 記述が実装とズレ
- **保守・リファクタ** — #106 API コールの typed 関数集約、#48 画像ホットリンク→next/image プロキシ、#37〜#39 E2E テスト、#110 RLS 実効化（defense-in-depth・優先度低）
- **パッケージアップデート継続**（`/update-packages`）— G3 AI SDK / G4 UI(`lucide-react` major) / G6 開発ツール(`typescript`6, `eslint`10 等 major 多数) / G7 その他(`zod`, `schema-dts`2)

## Issue 化しづらい手動メモ
- **#150 の週次監査通知はデプロイ後の手動作業が残っている**（コードだけでは通知が始まらない）
  1. Supabase Dashboard（staging / production 両方）→ Edge Functions → Secrets に `LINE_CHANNEL_ACCESS_TOKEN` と `LINE_ADMIN_USER_ID` を設定（admin の user id は LINE Developers console の Messaging API チャネル → 「あなたのユーザーID」）
  2. `npx tsx scripts/setup-cron.ts --env=<env>` の出力 SQL を SQL Editor で実行（**関数デプロイ後**に）
- **CLAUDE.md L17 の Scraper 記述を修正**（「Jina Reader API」→ 実装は `__NEXT_DATA__` 抽出。ARCHITECTURE.md 側は整合済み）
- **Vercel Dashboard で Node.js を 24.x に設定**（Settings → Build & Development Settings → Node.js Version）

## 横断的な注意点（環境・運用の gotcha）
- **PR は必ず `--base develop`**（`/create-pr` を使うと安全）。過去に main へ誤マージあり（PR #95）
- **`Closes #NNN` は develop への PR では発火しない**（GitHub はデフォルトブランチへのマージ時のみ自動クローズ）。全 PR が develop 向けのため、**Issue は main マージ後に手動で閉じる**必要がある
- **`supabase/setup-cli` が `version: latest`** のため、コードを変えなくても CLI 更新で CI が壊れ得る。特に `test-migrations.yml` は `supabase/migrations/**` 変更時のみ動くので、壊れてから気付くまで数ヶ月空くことがある（実例: 2026-08 に `supabase start` が Edge Function の生成物を読めず失敗。`npm run functions:build` を前段に追加して解消）
- **Vercel Preview の Deployment Protection は Off**（staging の LINE Webhook を通すため）
- **staging LINE Webhook URL**: `https://recipe-app-git-develop-mktus-projects.vercel.app/api/webhook/line`
- **ローカルでのレシピ取得**: `supabase functions serve` を別ターミナルで起動が必要
- **ローカルはアカウント削除不可**（DevAuthProvider の getAccessToken が null）
- **ローカルでレシピ追加には `dev-user-001` の users 行が必要**（`supabase/seed.sql`）。無いと create 失敗 → `npx supabase db reset` で seed 再投入
- **API は ID トークン検証必須**（dev は `NEXT_PUBLIC_LIFF_ID` 空でバイパス）。クライアントからの呼び出しは `useAuthedFetch` を使う
- **Supabase キー**: アプリ全体は `SUPABASE_SECRET_KEY`（`sb_secret_...`）、Edge Functions 内部は `SUPABASE_SERVICE_ROLE_KEY`（自動インジェクト）
- **pg_cron の command に secret key が平文で埋まっている**（`SELECT * FROM cron.job;` で見える）。キーをローテーションしたら cron ジョブも貼り直しが必要
- **cron ジョブ定義の正本は `scripts/setup-cron.ts`**（#150 で全ジョブを集約）。DB は変更せず貼り付け用の冪等 SQL を出力するだけなので、**出力を SQL Editor で実行するまで反映されない**。ダッシュボードで直接いじると次の貼り直しで消える
- **fnm の PATH**: ターミナル起動時に `eval "$(fnm env --use-on-cd --shell zsh)"` が必要
- **本番/staging で `NEXT_PUBLIC_APP_URL` 設定必須**（未設定だと LINE トーク上の規約・プライバシーリンクが機能しない）

## 主要な参照ポインタ（非自明なものだけ）
- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・API構成（実装の正本）
- `docs/DATABASE_DESIGN.md` - DB設計
- `docs/SCRAPING_POLICY.md` - スクレイピング方針・規約確認記録の正本
- `src/lib/recipe/parse-recipe.ts` - 解析フロー（JSON-LD → __NEXT_DATA__ → OGP → 空結果）
- `src/lib/search/` - 検索ロジックの正本。LINE Bot と Web（`get-recipes` Edge Function）で共有し、Edge へは `npm run functions:build` でコピーされる（共有元を増やしたら `supabase-functions.yml` の `paths` にも追加）
- `src/lib/auth/verify-line-token.ts` / `src/lib/api/auth-guard.ts` - ID トークン検証・API 認証ガード
- `supabase/migrations/20260702000000_clarify_rls_policies.sql` - RLS（service_role ベース・設計意図をコメント記載）
- `.claude/skills/legal-check/skill.md` - 法的リスクチェック（Issue 一元化・線引き基準）

## GitHub リポジトリ
https://github.com/mktu/recipe-app
