# セッション引き継ぎ

## 最終更新
2026-02-03 (エイリアス登録完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能完了・エイリアス登録完了**

## 直近の完了タスク
- [x] **エイリアス登録（125件）**
  - 主要な表記揺れを `ingredient_aliases` テーブルに登録
  - ひらがな/カタカナ/漢字の変換対応（玉ねぎ→たまねぎ、人参→にんじん等）
  - seed.sql（ローカル用）+ マイグレーション（本番用）の両方に追加
  - GitHub Actions CI で本番DBに自動反映
- [x] **Bot検索機能の実装**
- [x] **Flex Messageでレシピカード表示**
- [x] **RLS問題の解決**

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] リッチメニュー画像の本番デザイン作成
- [ ] LP（ランディングページ）作成
- [ ] テスト用スクリプト作成

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- **RLS注意:** Webhookでは `createServerClient`（Secret Key）を使用すること
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **GitHub Secrets:** `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` が必要（CI用）

## コミット履歴（直近）
```
15dc36d feat: add ingredient aliases for search flexibility
9c308e9 add skills/end-session/SKILL.md
3c331c3 feat: add bot search functionality with ingredient resolver
8569c24 docs: update SESSION.md for session handoff (bot search design)
ab94fe8 style: match Flex Message colors to LIFF app design
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `supabase/seed.sql` - 食材マスター・エイリアスのシードデータ **[今回更新]**
- `supabase/migrations/20260203143453_add_ingredient_aliases.sql` - エイリアス登録マイグレーション **[今回追加]**
- `.github/workflows/supabase-migrate.yml` - Supabase CI設定
- `src/app/api/webhook/line/route.ts` - LINE Webhook エンドポイント
- `src/lib/line/search-handler.ts` - Bot検索ハンドラ
- `src/lib/line/ingredient-resolver/` - 食材解決の抽象化
