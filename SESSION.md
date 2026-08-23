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
- **食材マッチングの積み残し**（#144 の検討中に判明。#148・#150・#152 は完了。着手順は #147 → #149 が素直）— #147 エイリアス生成後にレシピが再リンクされない、#149 auto-alias のドキュメント整合（ARCHITECTURE.md に判定ロジック未記載 + ADR-001 の「調理法除去は却下」が #152 で覆り「将来の拡張」2項目も実装済み）
- **検索の積み残し**（#144 の複数キーワード対応から派生。#144・#154 は完了）— #163 全語が食材に解決したクエリでベクトル検索フォールバックが効かない（発動条件だけ広げても `findByVectorSearch` の `eligible` が食材条件 AND で絞るため補完されず、制約の緩め方の判断が要る）
- **保守・リファクタ** — #106 API コールの typed 関数集約、#48 画像ホットリンク→next/image プロキシ、#37〜#39 E2E テスト、#110 RLS 実効化（defense-in-depth・優先度低）
- **パッケージアップデート継続**（`/update-packages`）— G3 AI SDK / G4 UI(`lucide-react` major) / G6 開発ツール(`typescript`6, `eslint`10 等 major 多数) / G7 その他(`zod`, `schema-dts`2)

## Issue 化しづらい手動メモ
- **CLAUDE.md L17 の Scraper 記述を修正**（「Jina Reader API」→ 実装は `__NEXT_DATA__` 抽出。ARCHITECTURE.md 側は整合済み）
- **Vercel Dashboard で Node.js を 24.x に設定**（Settings → Build & Development Settings → Node.js Version）

## 横断的な注意点（環境・運用の gotcha）
- **PR は必ず `--base develop`**（`/create-pr` を使うと安全）。過去に main へ誤マージあり（PR #95）
- **`Closes #NNN` は develop への PR では発火しない**（GitHub はデフォルトブランチへのマージ時のみ自動クローズ）。全 PR が develop 向けのため、**Issue は main マージ後に手動で閉じる**必要がある
- **`supabase/setup-cli` が `version: latest`** のため、コードを変えなくても CLI 更新で CI が壊れ得る。特に `test-migrations.yml` は `supabase/migrations/**` 変更時のみ動くので、壊れてから気付くまで数ヶ月空くことがある（実例: 2026-08 に `supabase start` が Edge Function の生成物を読めず失敗。`npm run functions:build` を前段に追加して解消）
- **`supabase start` を使うワークフローには必ず `npm run functions:build` を前段に入れる**。生成物は gitignore 対象なので、クリーンチェックアウトでは `config.toml` が宣言する関数をバンドルできず `supabase start` が落ちる。**Edge Function を新規追加したら `test-migrations.yml` と `e2e.yml` の両方を確認すること**（#150 で `audit-auto-generated` を追加した際、e2e 側が漏れて main が一時的に赤くなった）
- **`E2E Tests` は現状ほぼ何も検証していない**。`e2e/` にテストが1本も無く、`--pass-with-no-tests` で緑にしているだけ（トリガーは main への push と `workflow_dispatch` のみ、PR では走らない）。実テストは #37〜#39 で書く。現時点で守れているのは「`supabase start` が通る」ことだけ
- **Vercel Preview の Deployment Protection は Off**（staging の LINE Webhook を通すため）
- **staging LINE Webhook URL**: `https://recipe-app-git-develop-mktus-projects.vercel.app/api/webhook/line`
- **ローカルでのレシピ取得**: `supabase functions serve` を別ターミナルで起動が必要
- **ローカルはアカウント削除不可**（DevAuthProvider の getAccessToken が null）
- **ローカルでレシピ追加には `dev-user-001` の users 行が必要**（`supabase/seed.sql`）。無いと create 失敗 → `npx supabase db reset` で seed 再投入
- **API は ID トークン検証必須**（dev は `NEXT_PUBLIC_LIFF_ID` 空でバイパス）。クライアントからの呼び出しは `useAuthedFetch` を使う
- **Supabase キー**: アプリ全体は `SUPABASE_SECRET_KEY`（`sb_secret_...`）、Edge Functions 内部は `SUPABASE_SERVICE_ROLE_KEY`（自動インジェクト）
- **pg_cron の command に secret key が平文で埋まっている**（`SELECT * FROM cron.job;` で見える）。キーをローテーションしたら cron ジョブも貼り直しが必要
- **cron ジョブ定義の正本は `scripts/setup-cron.ts`**（#150 で全ジョブを集約）。DB は変更せず貼り付け用の冪等 SQL を出力するだけなので、**出力を SQL Editor で実行するまで反映されない**。ダッシュボードで直接いじると次の貼り直しで消える。staging / 本番ともに4ジョブ（`generate-embeddings` / `auto-alias-daily` / `audit-auto-generated-weekly` / `cleanup-cron-logs`）を登録済み
- **食材名の正規化を変えると既存エイリアスが空振りする**。auto-alias は `unmatched_ingredients.normalized_name` を**そのまま**エイリアス名／新規食材名に使う（`src/lib/batch/alias-generator.ts`）。つまり既存 `ingredient_aliases.alias` は「登録時点の正規化の出力」がキーであり、`normalizeIngredientName` を強化すると古い alias 行は引かれなくなる（実害は薄い＝剥がした後の名前が完全一致／部分一致で拾われる）。**除去語を追加するときはマスタ名・エイリアスにその語が出現しないか必ず確認する**（#152 で `薄切り` を除外したのはマスタに `牛薄切り肉` が実在するため）
- **自動追加食材の監査通知が毎週月曜 09:00 JST に届く**（#150、`audit-auto-generated`）。カテゴリ誤りを見つけたら `UPDATE ingredients SET category=...`、ゴミ食材は `needs_review = true` で検索・マッチングから外す（読み取り側4箇所が `needs_review = false` で除外している）。**流入自体は #152 で正規化を強化して抑えた**（切り方の除去・「、」分割・調味料判定のカナ揺れ吸収）が、ゼロにはならないので通知は引き続き確認する。**通知が届かない週はジョブ故障を疑う**（0件でも「0 件」で届く設計）
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
