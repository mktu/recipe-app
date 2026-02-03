# セッション引き継ぎ

## 最終更新
2026-02-03 (Bot検索機能の設計完了)

## 現在のフェーズ
フェーズ 3：LINE Messaging API 連携 - **Bot検索機能実装中**

## 直近の完了タスク
- [x] **Flex Messageでレシピカード表示**
  - `src/lib/line/flex-message.ts` を新規作成
  - サムネイル + タイトル + ソース名 + 「レシピを見る」ボタン
  - 単一カード（Bubble）と複数カード（Carousel）対応
  - LIFFアプリとデザイン統一（Primary: #f59e0b）
- [x] **URLプレビュー（OGP）調査**
  - LINE BotからのURLはOGP展開されないことを確認
  - → Flex Messageで自前表示が必要
- [x] **RLS問題の解決**
  - Webhook（サーバーサイド）では `createServerClient` を使用
  - 公開キー版はRLSでブロックされるため

## 進行中のタスク
- [ ] **Bot検索機能の実装** ← **次のセッションで着手**

## 次にやること（優先度順）

### Bot検索機能（最優先）

**確定した仕様:**
1. ユーザー入力をスペースで分割
2. 各単語を食材マスターで照合
3. マッチした単語 → `ingredientIds`（食材検索）
4. マッチしなかった単語 → `searchQuery`（タイトル検索）
5. 両方の条件でAND検索

**例:**
| 入力 | 食材条件 | タイトル条件 | 結果 |
|------|----------|--------------|------|
| `鶏肉 玉ねぎ` | 鶏肉 AND 玉ねぎ | - | 両方使うレシピ |
| `カレー` | - | カレー | タイトルにカレー |
| `豚肉 カレー` | 豚肉 | カレー | 豚肉使用 & タイトルにカレー |

**実装ステップ:**
1. 入力テキストをパースする関数を作成
2. 食材マスターとの照合ロジック
3. `fetchRecipes` のサーバークライアント版を作成
4. Webhookに検索ハンドラを追加
5. 件数による出し分け（4件以上→LIFF誘導）

**現在のテストコマンド:**
- `テスト` / `test` → 最新3件のレシピをFlex Messageで返す（動作確認用）

### その他タスク（優先度低）
- [ ] リッチメニュー画像の本番デザイン作成
- [ ] LP（ランディングページ）作成
- [ ] テスト用スクリプト作成

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- **RLS注意:** Webhookでは `createServerClient`（Secret Key）を使用すること
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行

## コミット履歴（直近）
```
ab94fe8 style: match Flex Message colors to LIFF app design
a0faa5d feat: add Flex Message recipe card for LINE bot
b32170c debug: use server client directly for test command
f1d4449 debug: add logging for test command
8244918 feat: add test command for URL preview verification
b974e02 feat: add help message response for rich menu support
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/app/api/webhook/line/route.ts` - LINE Webhook エンドポイント
- `src/lib/line/flex-message.ts` - Flex Messageビルダー **[今回追加]**
- `src/lib/db/queries/recipes.ts` - レシピ取得クエリ（`fetchRecipes`）
- `src/lib/recipe/match-ingredients.ts` - 食材マッチングロジック
