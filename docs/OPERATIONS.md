# 運用ガイド（開発フロー・CI・環境の gotcha）

実装ドキュメントに行き先がない、横断的な運用上の注意点をここに集約する。
LINE 固有は `docs/LINE_SETUP.md`、Edge Function / cron は `docs/EDGE_FUNCTIONS.md`、
ローカル環境は `docs/SUPABASE_LOCAL.md` を参照。

## 開発フロー

### PR は必ず `--base develop`

`gh pr create` のデフォルトベースは `main` なので、明示しないと本番ブランチへ PR が飛ぶ。
`/create-pr` スキルを使うと `--base develop` が強制される。

> 過去に main へ誤マージした実績あり（PR #95）。

### `Closes #NNN` は develop への PR では発火しない

GitHub が Issue を自動クローズするのは**デフォルトブランチ（main）へマージされたとき**だけ。
本プロジェクトは全 PR が develop 向けなので、**Issue は main マージ後に手動で閉じる**必要がある。
PR 本文に `Closes #NNN` を書くこと自体は紐付けとして有用なので続けてよい。

## CI

### `supabase/setup-cli` が `version: latest`

コードを変えなくても CLI 更新で CI が壊れ得る。特に `test-migrations.yml` は
`supabase/migrations/**` の変更時のみ走るため、**壊れてから気付くまで数ヶ月空くことがある**。

> 実例: 2026-08 に `supabase start` が Edge Function の生成物を読めず失敗。
> `npm run functions:build` を前段に追加して解消（詳細は `docs/EDGE_FUNCTIONS.md`）。

### `E2E Tests` は現状ほぼ何も検証していない

`e2e/` にテストが1本も無く、`--pass-with-no-tests` で緑にしているだけ。
トリガーは main への push と `workflow_dispatch` のみで、**PR では走らない**。
現時点でこのジョブが守れているのは「`supabase start` が通る」ことだけ。

実テストは #37〜#39 で書く。それまでこのジョブの緑を品質の根拠にしないこと。

## デプロイ・ホスティング

### Vercel Preview の Deployment Protection は Off

staging の LINE Webhook を通すため意図的に無効化している。有効化すると
LINE からの POST が認証で弾かれて staging のボットが無反応になる。

## ローカル環境

### fnm の PATH

ターミナル起動時に以下が必要:

```bash
eval "$(fnm env --use-on-cd --shell zsh)"
```

## 未処理の手動メモ

Issue 化するか判断が必要な、コードだけからは分からない事項。

- **Vercel Dashboard で Node.js を 24.x に設定**
  （Settings → Build & Development Settings → Node.js Version）
- **`ingredients_raw` の `amount` が全件空**（本番29件、登録初日から）。
  `{"name":"うどん 2玉","amount":""}` のように分量が `name` 側に入っており、
  `docs/DATABASE_DESIGN.md` の想定（`{name:"なす", amount:"2本"}`）と乖離している。
  #170 の調査中に発見。Issue 化するか要判断

## 主要な参照ポインタ（非自明なものだけ）

- `docs/ARCHITECTURE.md` - アーキテクチャ全体像・API 構成（実装の正本）
- `docs/DATABASE_DESIGN.md` - DB 設計
- `docs/SCRAPING_POLICY.md` - スクレイピング方針・規約確認記録の正本
- `src/lib/recipe/parse-recipe.ts` - 解析フロー（JSON-LD → `__NEXT_DATA__` → OGP → 空結果）
- `src/lib/search/` - 検索ロジックの正本。LINE Bot と Web（`get-recipes` Edge Function）で共有
- `src/lib/auth/verify-line-token.ts` / `src/lib/api/auth-guard.ts` - ID トークン検証・API 認証ガード
- `supabase/migrations/20260702000000_clarify_rls_policies.sql` - RLS（service_role ベース・設計意図をコメント記載）
- `scripts/setup-cron.ts` - cron ジョブ定義の正本
- `.claude/skills/legal-check/skill.md` - 法的リスクチェック（Issue 一元化・線引き基準）

## GitHub リポジトリ

https://github.com/mktu/recipe-app
