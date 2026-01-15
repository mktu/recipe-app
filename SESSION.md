# セッション引き継ぎ

## 最終更新
2025-01-15 (デザイントークン定義完了)

## 現在のフェーズ
フェーズ 1：Web/LIFF 基盤と DB 連携（準備段階）

## 直近の完了タスク
- [x] プロジェクトセットアップ（Next.js, Tailwind, shadcn/ui）
- [x] Git リポジトリ初期化
- [x] requirements.md 作成（要件定義）
- [x] CLAUDE.md 作成（開発ガイド）
- [x] ESLint ルール追加（ファイル肥大化防止: max-lines, complexity）
- [x] husky + lint-staged 設定（コミット前 lint）
- [x] 食材マスター初期データ作成（seed/ingredients.json, 152件）
- [x] セッション引き継ぎ機構の構築（SESSION.md）
- [x] **デザイントークン定義（v0 でデザイン検討 → globals.css に反映）**
- [x] **フォント設定（Noto Sans JP）**

## 進行中のタスク
なし

## 次にやること
- [ ] Supabase プロジェクト作成・設定
- [ ] 認証レイヤー実装（DevAuthProvider / LIFFAuthProvider）
- [ ] DB スキーマ作成（users, recipes, ingredients 等）
- [ ] 食材マスターのシード投入
- [ ] ホーム画面の実装（v0 デザインを参考に）

## ブロッカー・注意点
- 特になし

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

## コミット履歴（直近）
```
64a0be5 Update SESSION.md for handoff
7cf0dbc Add session handoff mechanism
2547fae Add TODO comment to homepage
8f99c17 Add pre-commit hook with husky + lint-staged
9abcc78 Add code complexity rules to prevent file bloat
ee641fc Rename idea.md to requirements.md
8798d1f Initial commit: RecipeHub project setup
```

## 備考
- v0 で作成したモックは削除済み（デザイントークンは globals.css に統合）
- 2列グリッド vs リスト形式は実装時に検討予定
