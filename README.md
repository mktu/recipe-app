# RecipeHub

複数のレシピサイトや SNS に散らばったお気に入りレシピを **URL ひとつで集約**し、冷蔵庫の余り物から「自分が認めたレシピ」を **食材タグで爆速検索**できる、自分専用のレシピ図鑑アプリです。

> **ビジョン:** 「献立選びをもっとラクに」

LINE で気になったレシピの URL を送るだけで、AI が「なす」「鶏肉」などのメイン食材を自動でタグ付けして保存。スーパーや冷蔵庫の前で食材タグをタップすれば、過去に自分が「美味しそう」と思って保存したレシピだけが即座に並びます。

## 主な機能

- **URL からレシピを自動集約** — URL を送ると AI がレシピ名・食材・ジャンル・材料リスト・調理時間を自動抽出
- **食材タグ検索** — 食材タグで絞り込み、家にある材料からレシピを決定
- **セマンティック検索** — ベクトル検索による意味ベースの検索
- **食材の表記ゆれ補正** — 「ナス」「茄子」→「なす」のように自動で名寄せ
- **LINE LIFF 連携** — LINE から URL を送信、アプリは LIFF 上で動作

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Frontend | Next.js (App Router) / TypeScript |
| Styling | Tailwind CSS / shadcn/ui (Radix UI) |
| Backend / DB | Supabase (Auth, PostgreSQL, pgvector, Edge Functions) |
| AI | Google Gemini 2.5 Flash（Vercel AI SDK 経由） |
| Scraper | JSON-LD 抽出（優先）→ `__NEXT_DATA__` → OGP のフォールバック |
| Platform | LINE LIFF / Messaging API |
| Deploy | Vercel |

## セットアップ

### 前提

- Node.js 24.x
- [Supabase CLI](https://supabase.com/docs/guides/local-development)（ローカル開発用）

### 手順

```bash
# 依存関係のインストール
npm install

# 環境変数の設定（下記の「環境変数」を参考に .env.local を作成）

# ローカル Supabase の起動（詳細は docs/SUPABASE_LOCAL.md）
supabase start

# 開発サーバーの起動
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くと動作確認できます。

レシピ取得（Edge Functions）を動かす場合は、別ターミナルで以下を起動してください。

```bash
npm run functions:serve
```

> `NEXT_PUBLIC_LIFF_ID` を空にすると、モックユーザーで動作する DevAuthProvider が使われ、LINE 連携なしでローカル開発できます。

### 環境変数

`.env.local` に以下を設定します（値は各サービスのダッシュボードから取得）。

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

ローカル Supabase / LINE 開発環境の詳しいセットアップは、それぞれ [`docs/SUPABASE_LOCAL.md`](docs/SUPABASE_LOCAL.md) / [`docs/LINE_SETUP.md`](docs/LINE_SETUP.md) を参照してください。

## ディレクトリ構成

```
recipe-app/
├── src/
│   ├── app/           # ページ・API Routes（(protected) / (public) / api）
│   ├── components/    # UI / 機能別 / プロバイダーコンポーネント
│   ├── hooks/         # カスタム hooks
│   ├── lib/           # ビジネスロジック（auth / db / line / scraper / recipe 等）
│   └── types/         # 型定義
├── supabase/          # Edge Functions (Deno) / マイグレーション
├── seed/              # 食材マスター等のシードデータ
├── docs/              # ドキュメント
└── scripts/           # 開発・運用スクリプト
```

詳細なアーキテクチャは [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) を参照してください。

## よく使うコマンド

```bash
npm run dev              # 開発サーバー起動
npm run build            # ビルド
npm run lint             # Lint
npm run test             # ユニットテスト（vitest）
npm run functions:serve  # Edge Functions のローカル起動
npm run functions:build  # Edge Functions ビルド（共有ロジック変更後）
```

その他のスクリプトは [`scripts/README.md`](scripts/README.md) を参照してください。

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [`CLAUDE.md`](CLAUDE.md) | 開発ルール・コマンド・プロジェクトガイド |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | アーキテクチャ全体像・API 構成・各種フロー |
| [`docs/DATABASE_DESIGN.md`](docs/DATABASE_DESIGN.md) | データベース設計 |
| [`requirements.md`](requirements.md) | プロダクト要求仕様 |

## 法的事項

本アプリの利用にあたっては、以下をご確認ください（アプリ内 `/privacy` ・ `/terms` でも閲覧できます）。

- プライバシーポリシー — [`src/app/(public)/privacy`](<src/app/(public)/privacy>)
- 利用規約 — [`src/app/(public)/terms`](<src/app/(public)/terms>)

レシピの解析では構造化メタデータのみを取得し、本文の複製は行いません。詳細は利用規約をご確認ください。
