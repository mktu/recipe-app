# RecipeHub - Claude Code 向けプロジェクトガイド

## プロジェクト概要

**RecipeHub** は、複数のレシピサイトや SNS からお気に入りレシピを URL で集約し、食材タグで検索できる自分専用のレシピ図鑑アプリ。

**ビジョン:** 「献立選びをもっとラクに」

プロダクト要件は `requirements.md` を、アーキテクチャ全体像は `docs/ARCHITECTURE.md` を参照。タスク管理は GitHub Issues で行う。

## 技術スタック

- **Frontend:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Backend/DB:** Supabase (Auth, PostgreSQL)
- **LLM API:** Gemini 2.5 Flash (Vercel AI SDK 経由)
- **Scraper:** JSON-LD 抽出（優先）→ `__NEXT_DATA__` 抽出 → OGP（最終フォールバック）
- **Platform:** LINE LIFF

## ディレクトリ構造

詳細は `docs/ARCHITECTURE.md` を参照。主要なパス：

- `src/lib/` - ビジネスロジック（`auth/`, `db/`, `line/`, `scraper/`, `recipe/` 等）
- `src/components/features/` - 機能別コンポーネント
- `src/hooks/` - カスタム hooks

## ドキュメント

各 doc には**コードを読んでも分からない gotcha** が入っている。踏んでから気付くと手戻りが大きい。

### 作業前に読む

**以下に着手する前に、対応する doc を読むこと。** 該当 doc を読まずに着手しない。

| これをする前に | これを読む |
|---|---|
| Edge Function・cron・バッチの変更 | `docs/EDGE_FUNCTIONS.md` |
| migration・RPC・スキーマの変更 | `docs/DATABASE_DESIGN.md` |
| LINE Bot・Webhook・Flex の変更 | `docs/LINE_SETUP.md` |
| CI / PR / デプロイ設定の変更、CI 結果の判断 | `docs/OPERATIONS.md` |
| ローカル環境のセットアップ・不調の調査 | `docs/SUPABASE_LOCAL.md` |
| 機能の実装全般（プランニングの前） | `docs/ARCHITECTURE.md` |
| スクレイピング対象サイトの追加・変更 | `docs/SCRAPING_POLICY.md` |

> 特に `docs/OPERATIONS.md` には**判断を誤らせる類**の注意点が入っている
> （例: `E2E Tests` は実質何も検証していないので、緑を品質の根拠にしてはいけない）。

### 知見を書く場所

セッション中に判明した「コードだけからは分からないこと」は、上表と同じ対応で書き戻す。
行き先が無い横断的な事項は `docs/OPERATIONS.md`。

| 種類 | 置き場所 |
|------|----------|
| タスク・課題・完了の経緯 | GitHub Issue / PR |
| 開発フロー・CI・デプロイの gotcha | `docs/OPERATIONS.md` |

## 開発ルール

### ブランチ戦略（GitHub Flow）

**ブランチ構成:**
- `main`: 本番ブランチ（保護設定済み）
- `develop`: ステージングブランチ
- `feature/*`: 機能開発ブランチ

**ワークフロー:**
1. `develop` から `feature/xxx` ブランチを作成
2. 開発・コミット
3. `develop` へ PR を作成（CI が自動実行）
4. レビュー後 `develop` にマージ → staging に自動デプロイ
5. 動作確認後、`develop` → `main` へ PR → マージ → 本番に自動デプロイ

**ブランチ命名規則:**
- `feature/add-xxx` - 新機能追加
- `feature/fix-xxx` - バグ修正
- `feature/refactor-xxx` - リファクタリング
- `feature/docs-xxx` - ドキュメント更新

**CI チェック（PR 時に自動実行）:**
- `npm run lint`
- `npm run build`
- マイグレーションテスト（DB変更時のみ）

### コーディング規約

- TypeScript strict mode を使用
- 関数コンポーネントと hooks を使用
- 命名規則:
  - コンポーネント: PascalCase (`RecipeCard.tsx`)
  - その他のファイル: kebab-case (`recipe-service.ts`)
  - 変数・関数: camelCase
  - 型・インターフェース: PascalCase
- インポートは `@/` エイリアスを使用

### ファイルサイズ・複雑度の制限

ESLint で以下の警告を設定済み（肥大化防止）:

| ルール | 閾値 | 意図 |
|--------|------|------|
| `max-lines` | 200行 | ファイルが大きくなりすぎない |
| `max-lines-per-function` | 50行 | 関数の責務を小さく保つ |
| `complexity` | 10 | if/for のネストを浅く保つ |

**警告が出たら分割を検討する。**

### 分割の基準

**コンポーネントの分割:**
- 1ファイル1コンポーネントを原則とする
- 150行を超えたら子コンポーネントへの切り出しを検討
- ロジックが複雑になったらカスタム hooks に切り出す

**ロジックの分割:**
- API 呼び出し → `lib/api/` または `lib/services/`
- 状態管理ロジック → カスタム hooks (`hooks/`)
- ユーティリティ関数 → `lib/utils/` (機能別にファイル分割)
- 型定義 → `types/`

**分割の判断基準:**
1. 同じロジックを2箇所以上で使う → 共通化
2. テストしたい単位 → 関数/hooks として切り出す
3. 責務が複数ある → ファイル分割

## よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Lint
npm run lint

# shadcn/ui コンポーネント追加
npx shadcn@latest add [component-name]

# 食材アンマッチ解析
./scripts/check-ingredient-match-rate.sh

# 埋め込みバックフィル（既存レシピのベクトル生成）
npm run backfill:embeddings

# Edge Functions ビルド（共有ロジック変更後に実行）
npm run functions:build

# DB 型定義更新
supabase gen types typescript --local > src/types/database.ts
```

その他のスクリプト（レシピ登録テスト等）は `scripts/README.md` を参照。

## カスタムコマンド

| キーワード | 実行内容 |
|------------|----------|
| 「アンマッチ解析」 | `./scripts/check-ingredient-match-rate.sh` を実行し、マッチ率と未マッチ食材TOP20を報告 |

## 環境構築

- **ローカル Supabase:** `docs/SUPABASE_LOCAL.md` を参照
- **LINE 開発環境:** `docs/LINE_SETUP.md` を参照
- **アーキテクチャ・環境構成:** `docs/ARCHITECTURE.md` を参照

doc の一覧と、どの作業の前に何を読むかは「ドキュメント > 作業前に読む」を参照。

## 環境変数

`.env.local` に以下を設定:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=

# LINE LIFF（LINE Login チャネル）
NEXT_PUBLIC_LIFF_ID=

# LINE Messaging API（Messaging API チャネル）
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
```

> `NEXT_PUBLIC_LIFF_ID` を空にすると DevAuthProvider（モックユーザー）で動作

## セッション引き継ぎ

**進捗の正本は GitHub Issues。** セッションをまたぐ状態ファイル（旧 `SESSION.md`）は廃止した。
現在地は `gh issue list --state open` で取得し、環境・運用の gotcha は docs 側に置く。

### 新セッション開始時

`/start-session` を実行する（open Issue の確認と worktree 利用判断を行う）。

### 実装タスク着手時

GitHub Issues のタスクに着手する場合は、プランニング（EnterPlanMode）の前に
**「ドキュメント > 作業前に読む」表に従って該当 doc を読む**こと。
最低でも `docs/ARCHITECTURE.md` は読んでアーキテクチャを把握する。

### セッション終了時

`/end-session` を実行する（doc 追従チェックと worktree の後片付けを行う）。
セッション中に判明した gotcha の書き戻し先は「ドキュメント > 知見を書く場所」を参照。
