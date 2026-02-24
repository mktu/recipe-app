# RecipeHub - Claude Code 向けプロジェクトガイド

## プロジェクト概要

**RecipeHub** は、複数のレシピサイトや SNS からお気に入りレシピを URL で集約し、食材タグで検索できる自分専用のレシピ図鑑アプリ。

**ビジョン:** 「献立の意思決定コストをゼロにする」

プロダクト要件は `requirements.md` を、機能詳細は `docs/backlogs/` を、アーキテクチャ全体像は `docs/ARCHITECTURE.md` を参照。

## 技術スタック

- **Frontend:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Backend/DB:** Supabase (Auth, PostgreSQL)
- **LLM API:** Gemini 2.5 Flash (Vercel AI SDK 経由)
- **Scraper:** JSON-LD 抽出（優先）+ Jina Reader API（フォールバック）
- **Platform:** LINE LIFF

## ディレクトリ構造

詳細は `docs/ARCHITECTURE.md` を参照。主要なパス：

- `src/lib/` - ビジネスロジック（`auth/`, `db/`, `line/`, `scraper/`, `recipe/` 等）
- `src/components/features/` - 機能別コンポーネント
- `src/hooks/` - カスタム hooks
- `docs/backlogs/` - エピック別バックログ

## 開発ルール

### ブランチ戦略（GitHub Flow）

**ブランチ構成:**
- `main`: 本番ブランチ（保護設定済み）
- `feature/*`: 機能開発ブランチ

**ワークフロー:**
1. `main` から `feature/xxx` ブランチを作成
2. 開発・コミット
3. PR を作成（CI が自動実行）
4. レビュー後 `main` にマージ

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

### 新セッション開始時

新しい AI セッションを開始したら、まず以下を確認:

```
SESSION.md を読んで現在の状態を把握してください
```

### バックログ実装タスク着手時

`docs/backlogs/` に記載されたエピックの実装に着手する場合は、
プランニング（EnterPlanMode）の前に `docs/ARCHITECTURE.md` を読んでアーキテクチャを把握すること。

### SESSION.md の更新タイミング

以下のタイミングで `SESSION.md` を更新する:

1. **大きなタスク完了時** - コミット後に更新
2. **セッション終了時** - 「セッション終了」と依頼された場合
3. **ブロッカー発生時** - 次回セッションで対応が必要な場合

### SESSION.md の構成

```markdown
## 最終更新
日時

## 現在のフェーズ
フェーズ X

## 直近の完了タスク
- [x] タスク1
- [x] タスク2

## 進行中のタスク
- [ ] タスク3

## 次にやること
- [ ] タスク4

## ブロッカー・注意点
特記事項

## 参照すべきファイル
関連ファイルのリスト

## コミット履歴（直近）
直近のコミットログ
```

### 注意

- Ctrl+C 等での強制終了時は更新されない
- 重要な進捗があった場合はこまめに更新を依頼すること
