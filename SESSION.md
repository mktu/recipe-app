# セッション引き継ぎ

## 最終更新
2026-02-06 (お菓子材料除外・味の素パーク除外)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能完了・本番DB整備完了**

## 直近の完了タスク
- [x] **お菓子材料・追加調味料の除外フィルタ追加**
  - グラニュー糖、めんつゆ、豆板醤、コチュジャン、はちみつ
  - ホットケーキミックス、ベーキングパウダー、ココアパウダー、ビスケット
  - お湯、水
- [x] **味の素パークをURL収集対象から除外**
  - JSON-LD非対応でGeminiフォールバック必須 → レート制限問題
- [x] **レシピ登録テスト実行**（新URLセット138件）
  - 成功: 126件、失敗: 12件（味の素パークのみ）
  - アンマッチ率: 34.8%

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] **さらなるマッチング改善（任意）**
  - 表記ゆれ対応: ニラ→にら、レンコン→れんこん
  - 食材マスター追加: 長芋、小ねぎ、ローズマリー、ミント など
- [ ] リッチメニュー画像の本番デザイン作成
- [ ] LP（ランディングページ）作成

## ブロッカー・注意点
- **ローカル開発:** `.env.local` の `NEXT_PUBLIC_LIFF_ID` を空にするとLINEログインなしで動作
- ローカル開発時は `supabase start` で起動が必要
- **RLS注意:** Webhookでは `createServerClient`（Secret Key）を使用すること
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行
- **GitHub Secrets:** `SUPABASE_ACCESS_TOKEN` と `SUPABASE_PROJECT_REF` が必要（CI用）
- **マイグレーション順序:** 食材マスター → エイリアスの順で適用される（タイムスタンプで制御）
- **ブランチ運用:** `feature/*` → PR → main マージの流れ

## コミット履歴（直近）
```
4094b06 feat: exclude sweets ingredients and remove Ajinomoto Park from URL collection
684d649 docs: update SESSION.md for session handoff
61d7ca2 Merge pull request #2 from mktu/feature/improve-ingredient-matching
36d66c7 fix(ci): use psql instead of supabase db execute
839e2ec feat: improve ingredient matching with seasoning filter and aliases
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `scripts/README.md` - テストスクリプトの使い方
- `src/lib/recipe/match-ingredients.ts` - 食材マッチング（調味料・お菓子材料除外ロジック）
- `scripts/collect-recipe-urls.ts` - URL収集スクリプト（味の素パーク除外済み）
- `scripts/check-ingredient-match-rate.sh` - マッチ率確認スクリプト
