# セッション引き継ぎ

## 最終更新
2025-01-17 (ホーム画面実装完了)

## 現在のフェーズ
フェーズ 1：Web/LIFF 基盤と DB 連携

## 直近の完了タスク
- [x] プロジェクトセットアップ（Next.js, Tailwind, shadcn/ui）
- [x] Git リポジトリ初期化
- [x] requirements.md 作成（要件定義）
- [x] CLAUDE.md 作成（開発ガイド）
- [x] ESLint ルール追加（ファイル肥大化防止: max-lines, complexity）
- [x] husky + lint-staged 設定（コミット前 lint）
- [x] 食材マスター初期データ作成（seed/ingredients.json, 152件）
- [x] セッション引き継ぎ機構の構築（SESSION.md）
- [x] デザイントークン定義（v0 でデザイン検討 → globals.css に反映）
- [x] フォント設定（Noto Sans JP）
- [x] Supabase プロジェクト作成（recipehub-dev）
- [x] DB スキーマ作成・RLS 設定
- [x] 食材マスターのシード投入（151件）
- [x] Supabase クライアント設定
- [x] Supabase CLI + Docker ローカル開発環境構築
- [x] マイグレーションファイル作成（supabase/migrations/）
- [x] 環境変数の切り替え設定（.env.local / .env.production）
- [x] 認証レイヤー実装（DevAuthProvider / LIFFAuthProvider）
- [x] ユーザー登録 API 実装（/api/auth/ensure-user）
- [x] **ホーム画面実装**

## 進行中のタスク
なし

## 次にやること
- [ ] レシピ追加画面の実装（/recipes/add）
- [ ] レシピ詳細画面の実装（/recipes/[id]）
- [ ] ESLint 警告の解消（コンポーネント分割）

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- Docker が必要（約 2GB のディスク使用）
- ESLint 警告あり（home-page.tsx, ingredient-filter.tsx, recipes.ts が行数/複雑度超過）

## ホーム画面実装内容

### 新規作成ファイル
```
src/
├── types/recipe.ts                           # 型定義
├── lib/db/queries/
│   ├── recipes.ts                            # レシピクエリ
│   └── ingredients.ts                        # 食材クエリ
├── hooks/
│   ├── use-recipes.ts                        # レシピ取得フック
│   └── use-ingredients.ts                    # 食材取得フック
├── components/features/home/
│   ├── home-page.tsx                         # メインコンポーネント
│   ├── recipe-list.tsx                       # レシピリスト
│   ├── recipe-card.tsx                       # レシピカード
│   ├── search-bar.tsx                        # 検索バー
│   ├── sort-select.tsx                       # ソート選択
│   ├── ingredient-filter.tsx                 # 食材フィルター
│   ├── empty-state.tsx                       # 空状態
│   └── add-recipe-fab.tsx                    # FABボタン
└── components/ui/
    ├── sheet.tsx                             # shadcn/ui Sheet
    ├── select.tsx                            # shadcn/ui Select
    └── skeleton.tsx                          # shadcn/ui Skeleton
```

### 機能
- レシピ一覧表示（リスト形式・1列）
- 検索バー（タイトル・メモ・ソース名で検索、300msデバウンス）
- 食材フィルター（ボトムシート、複数選択、ANDロジック）
- ソート（新しい順/古い順/よく見た順/最近見た順）
- FABボタン（レシピ追加画面へ遷移）
- 空状態表示（レシピなし/検索結果なし）
- ローディングスケルトン

## Supabase 設定（確定）

| 項目 | 値 |
|------|-----|
| 開発プロジェクト | recipehub-dev |
| 本番プロジェクト | 未作成（recipehub-prod 予定） |
| API キー形式 | 新形式（sb_publishable / sb_secret） |

**テーブル構成:**
- `users` - ユーザー情報
- `recipes` - レシピ情報
- `ingredients` - 食材マスター（151件）
- `ingredient_aliases` - 同義語辞書
- `recipe_ingredients` - 中間テーブル

**ローカル開発環境:**
| サービス | URL |
|----------|-----|
| Studio | http://127.0.0.1:54323 |
| API | http://127.0.0.1:54321 |
| DB | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## デザイン方針（確定）

| 項目 | 確定値 |
|------|--------|
| Primary | アンバー/ゴールド - oklch(0.75 0.16 75) |
| Accent | グリーン - oklch(0.65 0.2 145) |
| Background | 温かいホワイト - oklch(0.98 0.005 80) |
| フォント | Noto Sans JP |
| 角丸 | 0.75rem |
| レイアウト | モバイルファースト、リスト形式カード |

## 認証レイヤー（実装済み）

**使い方:**
```tsx
import { useAuth } from '@/lib/auth'

function MyComponent() {
  const { user, isLoading, isAuthenticated } = useAuth()
  // ...
}
```

**動作:**
- LIFF ID がない場合は DevAuthProvider にフォールバック
- 開発環境では固定のダミーユーザー（dev-user-001）でログイン済み扱い

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `seed/ingredients.json` - 食材マスター初期データ
- `src/app/globals.css` - デザイントークン（CSS変数）
- `src/app/layout.tsx` - フォント・メタデータ・AuthWrapper 設定
- `src/lib/auth/` - 認証レイヤー（DevAuth / LIFFAuth）
- `src/lib/db/client.ts` - Supabase クライアント
- `src/lib/db/queries/` - DBクエリ関数
- `src/types/database.ts` - DB 型定義
- `src/types/recipe.ts` - レシピ関連型定義
- `src/hooks/` - カスタムフック
- `src/components/features/home/` - ホーム画面コンポーネント

## コミット履歴（直近）
```
a535a51 Add authentication layer with DevAuth and LIFF providers
8e64aff Update SESSION.md for handoff
9339cd0 Add Supabase CLI local development environment
3587280 Update SESSION.md for Supabase setup completion
136d6c7 Add Supabase client and database schema
```

## 備考
- レシピ詳細画面の recordRecipeView は未実装（TODO）
- ESLint 警告は将来のリファクタリングで対応予定
