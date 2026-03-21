# E2E テスト整備

## ステータス
📋 未着手

## 背景・課題

- 機能追加が続いており、手動での動作確認コストが増大している
- オンボーディング・レシピ追加・検索フィルターなど複数フローをまたぐ
  デグレを検知する手段がない
- 本番リリース前の品質保証を自動化したい

## 方針

### フレームワーク

**Playwright** を採用。

- Next.js App Router との相性が良い
- ネットワークインターセプト（`page.route()`）で外部依存をモック可能
- `@playwright/test` の組み込み機能が充実

### DB 戦略

**Local Supabase を使う**（モックなし）。

ほぼ全フローが DB データを前提とするため、API を全モックすると
「UI が静的なデータを表示できること」しか保証できず E2E の価値が低くなる。

- ローカル: `supabase start` で起動
- CI (GitHub Actions): `supabase/setup-cli` action + `supabase start`（ubuntu-latest は Docker 対応）
- 各テストファイル実行前にテスト用ユーザーのデータをリセット（`supabase db reset` は重いため行単位で DELETE）

### 認証

**DevAuth モード**（`NEXT_PUBLIC_LIFF_ID=''`）を使用。LINE LIFF は不要。

### 外部サービスのモック

Playwright の `page.route()` でインターセプト：

| サービス | モック理由 |
|----------|-----------|
| Edge Function（get-recipes, onboarding-scrape） | 実通信は遅い・不安定 |
| Gemini AI（レシピ parse） | API コスト・再現性 |
| Jina Reader API | 外部依存 |
| LINE push 通知 | テスト環境から送信不可 |

### ディレクトリ構造

```
e2e/
├── fixtures/
│   ├── auth.ts              # DevAuth ユーザー定数
│   ├── db.ts                # テスト用 DB ヘルパー（シード・クリーン）
│   └── mock-data.ts         # API モック用レスポンスデータ
├── pages/                   # Page Object Model
│   ├── home-page.ts
│   ├── onboarding-page.ts
│   ├── onboarding-result-page.ts
│   ├── recipe-add-page.ts
│   └── recipe-detail-page.ts
├── onboarding.spec.ts
├── home.spec.ts
├── recipe-add.spec.ts
├── recipe-detail.spec.ts
└── playwright.config.ts
```

## テストシナリオ一覧

### 優先度：高

#### 1. OnboardingGuard の制御

| ケース | 概要 |
|--------|------|
| 新規ユーザーリダイレクト | `onboarding_completed_at = NULL` の状態で `/` アクセス → `/onboarding` にリダイレクトされること |
| 完了済みユーザー通過 | `onboarding_completed_at` が設定済みの状態で `/` アクセス → リダイレクトしないこと |
| `/onboarding` は通過 | 未完了ユーザーが `/onboarding` にアクセスしても無限リダイレクトしないこと |

#### 2. オンボーディング フルフロー

| ケース | 概要 |
|--------|------|
| フルフロー | 食材入力 → 調理時間選択 → 送信 → ローディング → 候補表示 → 選択 → 登録 → ホームへ遷移 |
| スキップ（フォーム） | フォームでスキップ → `onboarding_completed_at` がセットされホームへ遷移 |
| スキップ（結果画面） | 候補表示後にスキップ → ホームへ遷移 |
| スクレイピング失敗 | Edge Function が `failed` を返す → 失敗メッセージが表示されること |
| 再実行 | 完了済みユーザーがホームのボタンから `/onboarding` に再アクセスできること |

#### 3. レシピ追加フロー

| ケース | 概要 |
|--------|------|
| フルフロー | URL 入力 → 確認画面（パース結果表示）→ 食材選択 → 保存 → ホームの一覧に反映 |
| バリデーション | 不正な URL → エラー表示 |
| 重複 URL | 登録済み URL → エラーまたは適切なメッセージ |

### 優先度：中

#### 4. ホーム画面

| ケース | 概要 |
|--------|------|
| レシピ一覧表示 | 登録済みレシピが表示されること |
| テキスト検索 | キーワード入力 → 一致するレシピのみ表示 |
| 食材フィルター | 食材選択 → 対象レシピのみ表示 |
| フィルタークリア | クリアボタン → 全件表示に戻ること |
| ソート切り替え | 各ソート順に切り替えて一覧が並び替わること（最低 2〜3 種） |

#### 5. レシピ詳細

| ケース | 概要 |
|--------|------|
| 詳細表示 | レシピカードクリック → 詳細ページに遷移、タイトル・食材が表示されること |
| メモ編集 | メモを入力・保存 → DB に反映・再表示で保持されること |
| 削除 | 削除ボタン → 確認後削除 → ホームの一覧から消えること |

### 優先度：低（後回し可）

- 各ソート順の網羅的な確認
- LP ページの表示確認
- エラーページ（認証失敗・404 など）

## テストデータ戦略

### テスト用ユーザー

```typescript
// e2e/fixtures/auth.ts
export const TEST_USER = {
  lineUserId: 'e2e-test-user-001',
  displayName: 'E2Eテストユーザー',
}
```

DevAuth モードでは `dev-user-001` が使われるため、テスト用に別ユーザーを定義。
（または `dev-user-001` をそのまま使い、テスト前後でデータをリセット）

### シードデータ

```typescript
// e2e/fixtures/db.ts
// テスト開始前: ユーザー・レシピ・食材リンクをシード
// テスト終了後: テストユーザーのデータを DELETE
```

### Edge Function のモックレスポンス例

```typescript
// e2e/fixtures/mock-data.ts
export const MOCK_ONBOARDING_CANDIDATES = [
  {
    url: 'https://delishkitchen.tv/recipes/123',
    title: '鶏の唐揚げ',
    imageUrl: 'https://example.com/image.jpg',
    cookingTimeMinutes: 20,
    ingredientsRaw: [
      { name: '鶏もも肉', amount: '300g' },
      { name: '醤油', amount: '大さじ2' },
    ],
    siteName: 'DELISH KITCHEN',
  },
]
```

## CI 設定

### トリガー方針

- **main マージ後（push to main）** に自動実行 → デグレを自動検知
- **手動トリガー（workflow_dispatch）** → 本番デプロイ前など任意のタイミングで実行可能
- PR 時は従来通り lint + build のみ（E2E は実行しない）

将来的にテストが安定・拡充したら、PR 時にパスフィルターで限定実行する選択肢もある：

```yaml
# 将来の拡張例（UI/ロジック変更のある PR のみ）
on:
  pull_request:
    paths:
      - 'src/app/**'
      - 'src/components/**'
      - 'src/lib/**'
```

### ワークフロー設定

```yaml
# .github/workflows/e2e.yml（イメージ）
name: E2E Tests
on:
  push:
    branches: [main]   # main マージ後に自動実行
  workflow_dispatch:   # 手動実行も可能

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase db reset   # migrations + seed
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          NEXT_PUBLIC_LIFF_ID: ''        # DevAuth モード
          NEXT_PUBLIC_SUPABASE_URL: http://localhost:54321
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ env.LOCAL_ANON_KEY }}
```

既存の CI（lint + build）とは別 job として独立させる。

## 実装順序

1. **Playwright セットアップ**
   - `npm install -D @playwright/test`
   - `playwright.config.ts` 作成（baseURL, devServer 設定）
   - GitHub Actions workflow 作成

2. **共通フィクスチャ整備**
   - `e2e/fixtures/db.ts`（シード・クリーン ヘルパー）
   - `e2e/fixtures/mock-data.ts`（モックレスポンス定数）
   - `e2e/fixtures/auth.ts`（テストユーザー定数）

3. **OnboardingGuard テスト**（最小構成で動作確認）

4. **オンボーディング フルフロー テスト**

5. **レシピ追加テスト**

6. **ホーム画面テスト**

7. **レシピ詳細テスト**

## 技術的な注意点

- **DevAuth モード:** `.env.test` に `NEXT_PUBLIC_LIFF_ID=''` を設定
- **ポーリングのテスト:** `page.route()` で `/api/onboarding/result` の最初の呼び出しは `pending`、2 回目以降は `completed` を返すように切り替える
- **非同期待機:** `page.waitForURL()` / `page.waitForSelector()` を使い、固定 sleep は避ける
- **Local Supabase の URL:** `supabase start` 後に `http://localhost:54321` で使用可能
- **Edge Function（get-recipes）:** レシピ一覧 API を `page.route('/api/recipes/list', ...)` でインターセプトするか、Local Supabase 上で Edge Function を実際に起動するかは実装時に判断
