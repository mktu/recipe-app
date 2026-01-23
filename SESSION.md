# セッション引き継ぎ

## 最終更新
2026-01-23 (AI解析機能の本実装完了)

## 現在のフェーズ
フェーズ 2：AI パース (Jina Reader + Gemini)

## 直近の完了タスク
- [x] **AI解析機能の本実装**
  - Jina Reader でWebページからテキスト取得
  - Gemini 2.5 Flash で構造化データ抽出
  - 食材マッチングロジック（alias検索 → 完全一致 → 新規作成）
  - `ai`, `@ai-sdk/google`, `zod` パッケージ追加

## 進行中のタスク
なし

## 次にやること（要計画）

### 優先度高：UX改善（バックグラウンド解析）

**現在の問題:**
1. delishkitchenなどメジャーサイトでJina Readerがブロックされる（HTTP 451）
2. 解析に約20秒かかり、ユーザーが待たされる

**提案された解決策:**

**課題1: スクレイピング問題**
- OGP情報をフォールバックとして取得（タイトル・画像のみ）
- 取得できない場合は手動入力を促す

**課題2: 解析時間問題 → フロー変更**

現在のフロー:
```
URL入力 → 解析中（20秒待機） → 確認・編集画面 → 保存 → 一覧
```

提案フロー:
```
URL入力 → 即座に仮保存 → 一覧画面（解析中表示）
           ↓
      バックグラウンドで解析 → 完了したら更新
```

**実装に必要な変更:**
1. `recipes`テーブルに `parsing_status` カラム追加（`pending` / `completed` / `failed`）
2. URL入力後、即座にDBに仮保存してバックグラウンド解析開始
3. 一覧画面で「解析中」カードの表示
4. SWRのポーリングで解析完了を検知
5. 確認・編集画面は不要になる可能性（詳細画面で編集）

### その他
- [ ] 全項目編集機能（将来対応として保留中）

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- Docker が必要（約 2GB のディスク使用）
- 外部画像URLは next/image ではなく通常の img タグを使用
- 認証はLIFF SDKベースでクライアントサイド取得
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **Jina Reader制限:** 一部サイト（delishkitchen等）はHTTP 451でブロックされる

## AI解析関連ファイル構成

```
src/
├── lib/
│   ├── llm/
│   │   ├── gemini-client.ts        # Gemini 2.5 Flash クライアント
│   │   ├── recipe-schema.ts        # Zodスキーマ定義
│   │   └── extract-recipe.ts       # LLM抽出ロジック（プロンプト含む）
│   ├── scraper/
│   │   └── jina-reader.ts          # Jina Reader APIラッパー
│   └── recipe/
│       ├── parse-recipe.ts         # オーケストレータ（Jina→Gemini→マッチング）
│       └── match-ingredients.ts    # 食材マッチングロジック
```

## 技術的なポイント

### AI解析フロー
```
URL → Jina Reader（テキスト取得） → Gemini（構造化抽出） → 食材マッチング → ParsedRecipe
```

### 食材マッチングロジック
1. `ingredient_aliases` でエイリアス検索
2. `ingredients` で完全一致検索
3. 見つからなければ新規作成（`needs_review: true`）

### Geminiモデル設定
```typescript
// src/lib/llm/gemini-client.ts
export const geminiFlash = google('gemini-2.5-flash')
```
※ 無料枠があるモデルは限られている。`gemini-2.0-flash`等は無料枠なし。

## コミット履歴（直近）
```
5a7a996 Implement AI recipe parsing with Jina Reader and Gemini
f338849 Update SESSION.md for handoff
c9ed3db Improve memo UI with inline editing
7b0701e Add recipe detail page with SWR for data fetching
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/lib/llm/` - LLM関連（Gemini）
- `src/lib/scraper/` - スクレイピング（Jina Reader）
- `src/lib/recipe/` - レシピ解析・食材マッチング
- `src/lib/db/queries/` - Supabase クエリ
