# RecipeHub アーキテクチャドキュメント

## 目次

1. [概要](#概要)
2. [技術スタック](#技術スタック)
3. [ディレクトリ構造](#ディレクトリ構造)
4. [環境構成](#環境構成)
5. [システム構成図](#システム構成図)
6. [ページ構成](#ページ構成)
7. [API構成](#api構成)
8. [Edge Functions](#edge-functions)
9. [データベース設計](#データベース設計)
10. [認証フロー](#認証フロー)
11. [レシピ解析フロー](#レシピ解析フロー)
12. [食材名寄せフロー](#食材名寄せフロー)
13. [CI/CD](#cicd)

> 開発ルール・コマンドは `CLAUDE.md` を参照

---

## 概要

**RecipeHub** は、複数のレシピサイトや SNS からお気に入りレシピを URL で集約し、食材タグで検索できる自分専用のレシピ図鑑アプリ。

**ビジョン:** 「献立の意思決定コストをゼロにする」

**主な機能:**
- URL からレシピ情報を自動抽出（AI解析）
- 食材タグによる絞り込み検索
- セマンティック検索（ベクトル検索）
- LINE Bot 連携

---

## 技術スタック

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Next.js   │  │    React    │  │  Tailwind CSS           │  │
│  │ (App Router)│  │             │  │  + shadcn/ui (Radix UI) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend                                   │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │  Supabase           │  │  Edge Functions (Deno)          │   │
│  │  - PostgreSQL       │  │  - get-recipes                  │   │
│  │  - pgvector         │  │  - generate-embeddings          │   │
│  │  - pg_cron          │  │  - auto-alias                   │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐    │
│  │ Google Gemini │  │  Jina Reader  │  │  LINE Platform    │    │
│  └───────────────┘  └───────────────┘  └───────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 主要ライブラリ

| カテゴリ | ライブラリ |
|---------|----------|
| Framework | Next.js (App Router) |
| UI | React, Tailwind CSS, shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Data Fetching | SWR |
| AI | Vercel AI SDK + Google Gemini |
| LINE | LIFF SDK, Messaging API SDK |
| Validation | Zod |

---

## ディレクトリ構造

```
recipe-app/
├── src/
│   ├── app/
│   │   ├── (protected)/      # 認証必須ページ（一覧・詳細・登録）
│   │   ├── (public)/         # 認証不要ページ（LP・利用規約等）
│   │   └── api/              # API Routes
│   ├── components/
│   │   ├── ui/               # shadcn/ui コンポーネント
│   │   ├── features/         # 機能別コンポーネント
│   │   └── providers/        # Context プロバイダー
│   ├── hooks/                # カスタム hooks
│   ├── lib/
│   │   ├── auth/             # 認証プロバイダー (LIFF / Dev)
│   │   ├── batch/            # Edge Functions 共有ロジック（Node.js）
│   │   ├── db/               # Supabase クライアント・クエリ
│   │   ├── embedding/        # ベクトル埋め込み
│   │   ├── line/             # LINE Bot・Flex Message
│   │   ├── llm/              # LLM 関連 (レシピ解析)
│   │   ├── recipe/           # レシピ処理ロジック
│   │   └── scraper/          # JSON-LD・Jina スクレイパー
│   └── types/                # 型定義
├── supabase/
│   ├── functions/            # Edge Functions (Deno)
│   └── migrations/           # DB マイグレーション
├── seed/                     # シードデータ
│   └── ingredients.json      # 食材マスター初期データ
├── docs/                     # ドキュメント
│   ├── backlogs/             # エピック別バックログ
│   └── ...
└── scripts/                  # 開発・運用スクリプト
```

---

## 環境構成

### 環境一覧

| コンポーネント | Local | Staging (現在本番) | Production (未作成) |
|--------------|-------|-------------------|-------------------|
| **Next.js** | localhost:3000 | Vercel | Vercel |
| **Supabase DB** | localhost:54322 | Supabase Cloud | Supabase Cloud (東京) |
| **Edge Functions** | supabase functions serve | Supabase Cloud | Supabase Cloud |
| **認証** | DevAuthProvider (モック) | LIFFAuthProvider | LIFFAuthProvider |
| **LINE Bot** | ngrok経由 | 本番Webhook | 本番Webhook |

**ローカル起動:**
```bash
supabase start      # Supabase ローカル起動
npm run dev         # Next.js 開発サーバー
```

> `NEXT_PUBLIC_LIFF_ID` を空にすると DevAuthProvider（モックユーザー）で動作

---

## システム構成図

### 全体アーキテクチャ

```mermaid
graph TB
    subgraph Client["Client"]
        LIFF["LINE LIFF (Webview)"]
        LINEApp["LINE App (Messaging)"]
    end

    subgraph Vercel["Vercel"]
        subgraph Pages["Pages - Protected"]
            Home["/ Home"]
            Detail["/recipes/id Detail"]
            Add["/recipes/add Add"]
            Confirm["/recipes/add/confirm Confirm"]
        end

        subgraph Public["Pages - Public"]
            LP["/lp Landing"]
            Privacy["/privacy"]
            Terms["/terms"]
        end

        subgraph APIRoutes["API Routes"]
            RecipeAPI["/api/recipes"]
            ParseAPI["/api/recipes/parse"]
            WebhookAPI["/api/webhook/line"]
        end
    end

    subgraph Supabase["Supabase"]
        DB[("PostgreSQL")]

        subgraph EdgeFunctions["Edge Functions"]
            GetRecipes["get-recipes"]
            GenEmbed["generate-embeddings"]
            AutoAlias["auto-alias"]
        end

        Cron["pg_cron"]
    end

    subgraph External["External Services"]
        Gemini["Gemini API"]
        Jina["Jina Reader"]
    end

    LIFF --> Pages
    LIFF --> Public
    LINEApp -->|Webhook| WebhookAPI

    Pages --> RecipeAPI
    RecipeAPI --> GetRecipes
    ParseAPI --> Jina
    ParseAPI --> Gemini

    GetRecipes --> DB
    GenEmbed --> DB
    GenEmbed --> Gemini
    AutoAlias --> DB
    AutoAlias --> Gemini

    Cron -->|every 5min| GenEmbed
    Cron -->|daily| AutoAlias
```

---

## ページ構成

| パス | 認証 | 説明 |
|-----|------|------|
| `/` | 必須 | レシピ一覧・食材フィルター・検索 |
| `/recipes/[id]` | 必須 | レシピ詳細・メモ編集・削除 |
| `/recipes/add` | 必須 | レシピURL入力 |
| `/recipes/add/confirm` | 必須 | 解析結果確認・食材選択・保存 |
| `/lp` | 不要 | 機能紹介・CTA |
| `/privacy` | 不要 | プライバシーポリシー |
| `/terms` | 不要 | 利用規約 |

---

## API構成

| エンドポイント | メソッド | 説明 |
|--------------|---------|------|
| `/api/auth/ensure-user` | POST | ユーザー確保（LINE UserID → DB登録） |
| `/api/recipes` | POST | レシピ作成 |
| `/api/recipes/[id]` | GET/PUT/DELETE | レシピ詳細取得・更新・削除 |
| `/api/recipes/list` | POST | 一覧取得（Edge Function経由） |
| `/api/recipes/parse` | POST | URL解析（Jina + Gemini） |
| `/api/webhook/line` | POST | LINE Webhook |

---

## Edge Functions

### 概要

Edge Functions は Supabase 上で動作する Deno ランタイムの関数。
**DB と同一リージョンで実行されるため低レイテンシ**を実現。

```mermaid
graph TB
    subgraph Triggers["Triggers"]
        API["API Route"]
        Cron["pg_cron (scheduled)"]
    end

    subgraph Functions["Edge Functions"]
        GetRecipes["get-recipes (manual)"]
        GenEmbed["generate-embeddings (5min)"]
        AutoAlias["auto-alias (daily)"]
    end

    subgraph Processing["Processing"]
        Sync["Sync"]
        Async["Async (202 Accepted)"]
    end

    API --> GetRecipes
    Cron -->|every 5min| GenEmbed
    Cron -->|daily| AutoAlias

    GetRecipes --> Sync
    GenEmbed --> Sync
    AutoAlias --> Async
```

### Edge Function 詳細

| 関数 | トリガー | 処理方式 | 説明 |
|------|---------|---------|------|
| `get-recipes` | API Route | 同期 | レシピ一覧取得（複数クエリ） |
| `generate-embeddings` | pg_cron (5分毎) | 同期 | 埋め込みベクトル生成 |
| `auto-alias` | pg_cron (1日1回) | **非同期** | 食材エイリアス自動生成 |

### auto-alias の非同期パターン

pg_cron には **タイムアウト制限**があるため、`auto-alias` は非同期パターンを採用。

```mermaid
sequenceDiagram
    participant Cron as pg_cron
    participant Func as auto-alias
    participant DB as PostgreSQL
    participant LLM as Gemini API

    Cron->>Func: HTTP call
    Func-->>Cron: 202 Accepted (immediate)

    Note over Func: Continue in background

    loop For each unmatched (max 100)
        Func->>DB: Get unmatched ingredient
        Func->>LLM: Request classification
        LLM-->>Func: Match result
        alt Match found
            Func->>DB: Register alias
        else No match
            Func->>DB: Add new ingredient
        end
        Func->>DB: Delete from unmatched
    end
```

### ソースコード管理

Edge Function の共有ロジックは `src/lib/batch/` で管理し、ビルド時に Deno 用に変換。

```
src/lib/batch/     →  npm run functions:build  →  supabase/functions/*/
(Node.js)                                          (Deno)
```

> 詳細は `docs/EDGE_FUNCTIONS.md` を参照

---

## データベース設計

### ER図

```mermaid
erDiagram
    users ||--o{ recipes : "has"
    recipes ||--o{ recipe_ingredients : "contains"
    ingredients ||--o{ recipe_ingredients : "used_in"
    ingredients ||--o{ ingredient_aliases : "has"
    ingredients ||--o| ingredients : "parent"
    recipes ||--o{ unmatched_ingredients : "has"

    users
    recipes
    ingredients
    ingredient_aliases
    recipe_ingredients
    unmatched_ingredients
```

### テーブル概要

| テーブル | 説明 |
|---------|------|
| `users` | LINE ユーザー情報 |
| `recipes` | レシピ情報（タイトル、URL、画像、メモ、埋め込みベクトル） |
| `ingredients` | 食材マスター（階層構造対応） |
| `ingredient_aliases` | 表記ゆれ対応（LLM自動生成含む） |
| `recipe_ingredients` | レシピ - 食材の中間テーブル |
| `unmatched_ingredients` | バッチ処理待ちの未マッチ食材 |

> 詳細なスキーマは `supabase/migrations/` を参照

---

## 認証フロー

### 認証プロバイダー抽象化

```mermaid
graph TB
    subgraph App["Application"]
        useAuth["useAuth Hook"]
        Context["AuthContext"]
    end

    subgraph Providers["Providers"]
        Dev["DevAuthProvider (dev)"]
        LIFF["LIFFAuthProvider (prod)"]
    end

    useAuth --> Context
    Context -->|LIFF_ID empty| Dev
    Context -->|LIFF_ID set| LIFF

    Dev -->|fixed| MockUser["Mock user (dev-user)"]
    LIFF --> LINELogin["LINE Login"]
    LINELogin --> LINEUser["LINE User"]
```

### LINE LIFF 認証フロー

```mermaid
sequenceDiagram
    participant User as User
    participant LIFF as LIFF App
    participant LINE as LINE Platform
    participant API as Next.js API
    participant DB as Supabase

    User->>LIFF: Open app
    LIFF->>LINE: liff.init()
    LINE-->>LIFF: Init complete

    alt Not logged in
        LIFF->>LINE: liff.login()
        LINE-->>User: LINE Login screen
        User->>LINE: Authenticate
        LINE-->>LIFF: Auth complete
    end

    LIFF->>LINE: liff.getProfile()
    LINE-->>LIFF: User profile

    LIFF->>API: POST /api/auth/ensure-user
    API->>DB: UPSERT users
    DB-->>API: User info
    API-->>LIFF: Auth complete
```

---

## レシピ解析フロー

### 解析戦略（フォールバック）

```mermaid
graph TB
    Start["URL Input"] --> Fetch["Fetch HTML"]

    Fetch --> Strategy1{"JSON-LD extract"}
    Strategy1 -->|Success| Result["Parse Result"]
    Strategy1 -->|Fail| Strategy2{"__NEXT_DATA__ extract"}

    Strategy2 -->|Success| Result
    Strategy2 -->|Fail| Strategy3["Jina Reader + Gemini"]

    Strategy3 --> Result

    Result --> Match["Ingredient Matching"]
    Match --> Save["Save to DB"]
```

---

## 食材名寄せフロー

### 登録時のマッチング

```mermaid
graph TB
    Input["AI extracted ingredient"] --> Normalize["Normalize (lowercase, trim)"]
    Normalize --> AliasCheck{"Search alias table"}

    AliasCheck -->|Match| Found["Get ingredient_id"]
    AliasCheck -->|No match| MasterCheck{"Search master table"}

    MasterCheck -->|Match| Found
    MasterCheck -->|No match| Unmatched["Record to unmatched_ingredients"]

    Found --> Save["Save to recipe_ingredients"]
    Unmatched --> BatchQueue["Queue for batch (auto-alias)"]
```

> バッチ処理の詳細は [Edge Functions](#edge-functions) セクションを参照

---

## CI/CD

### ワークフロー概要

```mermaid
graph TB
    subgraph PR["Pull Request"]
        Lint["Lint"]
        Build["Build"]
        FuncBuild["Edge Functions Build"]
        MigTest["Migration Test"]
    end

    subgraph Merge["After merge to main"]
        Deploy["Vercel Deploy"]
        MigPush["DB Migration Push"]
        FuncDeploy["Edge Functions Deploy"]
    end

    PR --> Merge
```

### GitHub Actions ワークフロー

| ワークフロー | トリガー | 処理内容 |
|------------|---------|---------|
| `ci.yml` | PR → main | Lint + Build + Functions Build |
| `test-migrations.yml` | PR (migrations変更時) | マイグレーションテスト |
| `supabase-migrate.yml` | Push → main (migrations変更時) | 本番DBマイグレーション |
| `supabase-functions.yml` | Push → main (functions変更時) | Edge Functionsデプロイ |

### デプロイ先

| コンポーネント | デプロイ先 | 方法 |
|--------------|----------|------|
| Next.js App | Vercel | Git 連携 (自動) |
| DB Migrations | Supabase | GitHub Actions |
| Edge Functions | Supabase | GitHub Actions |

> ディレクトリ構造の詳細は `CLAUDE.md` を参照
