# セッション引き継ぎ

## 最終更新
2026-02-07 (LINE Bot→LIFF検索引き継ぎ機能追加)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能完了・本番DB整備完了**

## 直近の完了タスク
- [x] **LINE Bot検索結果からLIFFサイトへの検索引き継ぎ機能**
  - クエリパラメータ `?q=検索テキスト&ingredients=id1,id2` 形式でLIFF URLを生成
  - Flex Messageに「もっと見る」ボタン付きカルーセルを追加
  - サーバーサイドでsearchParamsを受け取りClient Componentに初期値として渡す
- [x] **お菓子材料・追加調味料の除外フィルタ追加**
- [x] **味の素パークをURL収集対象から除外**

## 進行中のタスク
なし

## 次にやること（優先度順）
- [ ] **さらなるマッチング改善（任意）**
  - 表記ゆれ対応: ニラ→にら、レンコン→れんこん
  - 食材マスター追加: 長芋、小ねぎ、ローズマリー、ミント など
- [ ] リッチメニュー画像の本番デザイン作成
- [ ] LP（ランディングページ）作成
- [ ] **検索のサーバーサイドフェッチ統一（任意）**
  - 現状: 初期表示はサーバー、検索はクライアントサイドフェッチ
  - 提案: クエリパラメータ形式でサーバーサイドに統一（URL共有・戻る対応）
  - 優先度は低い（現状で動作に問題なし）

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
8e21141 feat: preserve search query when navigating from LINE Bot to LIFF
89d60d6 docs: update SESSION.md for session handoff
4094b06 feat: exclude sweets ingredients and remove Ajinomoto Park from URL collection
684d649 docs: update SESSION.md for session handoff
61d7ca2 Merge pull request #2 from mktu/feature/improve-ingredient-matching
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/lib/line/search-handler.ts` - 検索ハンドラー（LIFF URL生成追加）
- `src/lib/line/flex-message.ts` - Flex Message（もっと見るボタン追加）
- `src/app/page.tsx` - ホームページ（searchParams対応）
- `src/hooks/use-recipe-filters.ts` - 検索フィルターフック（初期値対応）
- `src/components/features/home/home-client.tsx` - ホームクライアント（initialFilters対応）
