# RecipeHub - Claude Code 向けプロジェクトガイド

## プロジェクト概要

**RecipeHub** は、複数のレシピサイトや SNS からお気に入りレシピを URL で集約し、食材タグで検索できる自分専用のレシピ図鑑アプリ。

**ビジョン:** 「献立の意思決定コストをゼロにする」

詳細な要件は `requirements.md` を参照。

## 技術スタック

- **Frontend:** Next.js (App Router), TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Backend/DB:** Supabase (Auth, PostgreSQL)
- **LLM API:** Gemini 1.5 Flash (Vercel AI SDK 経由)
- **Scraper:** Jina Reader API
- **Platform:** LINE LIFF

## ディレクトリ構造

```
recipe-app/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/
│   │   ├── ui/           # shadcn/ui コンポーネント
│   │   └── features/     # 機能別コンポーネント
│   ├── lib/
│   │   ├── auth/         # 認証プロバイダー (LIFF / Dev)
│   │   ├── db/           # Supabase クライアント・クエリ
│   │   ├── llm/          # LLM 関連 (レシピ解析)
│   │   └── utils.ts      # ユーティリティ
│   └── types/            # 型定義
├── seed/                 # シードデータ
│   └── ingredients.json  # 食材マスター初期データ (152件)
├── requirements.md       # プロジェクト要件定義書
└── CLAUDE.md             # このファイル
```

## 開発ルール

### コーディング規約

- TypeScript strict mode を使用
- 関数コンポーネントと hooks を使用
- 命名規則:
  - コンポーネント: PascalCase (`RecipeCard.tsx`)
  - その他のファイル: kebab-case (`recipe-service.ts`)
  - 変数・関数: camelCase
  - 型・インターフェース: PascalCase
- インポートは `@/` エイリアスを使用

### 認証の抽象化

LIFF 環境に依存せず開発できるよう、認証レイヤーを抽象化する:

```typescript
// lib/auth/index.ts で環境に応じて切り替え
// 開発時: DevAuthProvider (モック)
// 本番時: LIFFAuthProvider
```

開発時は `NODE_ENV=development` で固定のダミーユーザーを使用。

### DB 設計のポイント

- 食材は `ingredients` テーブルで正規化管理
- AI が出力した食材は `ingredient_aliases` で名寄せ
- レシピと食材の紐づけは `recipe_ingredients` 中間テーブル
- 詳細は `requirements.md` の「6. データベース設計」を参照

### LLM 連携のポイント

- Vercel AI SDK を使用し、プロバイダーを抽象化
- 食材抽出時は `seed/ingredients.json` のマスターリストを参照
- エイリアステーブルで表記ゆれを吸収

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
```

## 環境変数

`.env.local` に以下を設定:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=

# LINE LIFF (本番用)
NEXT_PUBLIC_LIFF_ID=
```

## 実装フェーズ

1. **フェーズ 1:** Web/LIFF 基盤と DB 連携
2. **フェーズ 2:** AI パース (Jina Reader + Gemini)
3. **フェーズ 3:** LINE Messaging API 連携

現在: **フェーズ 1 の準備段階**
