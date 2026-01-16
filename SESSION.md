# セッション引き継ぎ

## 最終更新
2025-01-16 (Supabase 設定完了)

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
- [x] **Supabase プロジェクト作成（recipehub-dev）**
- [x] **DB スキーマ作成・RLS 設定**
- [x] **食材マスターのシード投入（151件）**
- [x] **Supabase クライアント設定**

## 進行中のタスク
なし

## 次にやること
- [ ] 認証レイヤー実装（DevAuthProvider / LIFFAuthProvider）
- [ ] ホーム画面の実装（v0 デザインを参考に）

## ブロッカー・注意点
- 特になし

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

## デザイン方針（確定）

v0 を使ってデザインの方向性を策定済み。以下の画面モックを作成：
- ホーム画面（レシピ一覧）
- レシピ詳細画面
- レシピ追加画面（URL入力）

| 項目 | 確定値 |
|------|--------|
| Primary | アンバー/ゴールド - oklch(0.75 0.16 75) ≒ #f59e0b |
| Accent | グリーン - oklch(0.65 0.2 145) ≒ #22c55e |
| Background | 温かいホワイト - oklch(0.98 0.005 80) |
| フォント | Noto Sans JP |
| 角丸 | 0.75rem |
| レイアウト | モバイルファースト、リスト形式カード |

**デザインの特徴:**
- 食べログ等との差別化のためオレンジ → アンバー/ゴールドに変更
- タグは控えめなグレーアウトライン（写真とタイトルが主役）
- FABボタン（レシピ追加）は下部固定で片手操作対応

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `seed/ingredients.json` - 食材マスター初期データ
- `src/app/globals.css` - デザイントークン（CSS変数）
- `src/app/layout.tsx` - フォント・メタデータ設定
- `src/lib/db/client.ts` - Supabase クライアント
- `src/types/database.ts` - DB 型定義
- `supabase/schema.sql` - DB スキーマ・RLS ポリシー
- `supabase/seed.sql` - 食材シードデータ

## コミット履歴（直近）
```
136d6c7 Add Supabase client and database schema
145809d Add design tokens and update font to Noto Sans JP
64a0be5 Update SESSION.md for handoff
7cf0dbc Add session handoff mechanism
2547fae Add TODO comment to homepage
8f99c17 Add pre-commit hook with husky + lint-staged
```

## 備考
- v0 で作成したモックは削除済み（デザイントークンは globals.css に統合）
- 2列グリッド vs リスト形式は実装時に検討予定
- Supabase の新 API キー形式（sb_publishable / sb_secret）を使用
