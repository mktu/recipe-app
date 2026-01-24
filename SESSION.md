# セッション引き継ぎ

## 最終更新
2026-01-24 (JSON-LD抽出機能の実装完了)

## 現在のフェーズ
フェーズ 2：AI パース (Jina Reader + Gemini) - JSON-LD対応完了

## 直近の完了タスク
- [x] **JSON-LD構造化データ抽出の実装**
  - delishkitchen等のJinaブロックサイトに対応
  - HTML直接フェッチ → JSON-LD抽出 → 食材マッチング
  - Jina+Geminiへのフォールバック機能
  - schema-dts導入（型安全なschema.org型）
- [x] **AI SDK 6対応**
  - deprecated `generateObject` → `generateText({ output })` に移行
- [x] **sourceName修正**
  - `author`（レシピ作成者）→ `publisher`（サイト名）に変更
- [x] **食材セレクター修正**
  - `needs_review=true`の食材も表示されるように修正
  - `useSelectedIngredients`フック追加

## 進行中のタスク
なし

## 次にやること（要計画）

### 優先度高：UX改善（バックグラウンド解析）

**現在の問題:**
- 解析に約20秒かかり、ユーザーが待たされる

**提案フロー:**
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
- **JSON-LD対応サイト:** delishkitchen等はJSON-LDで高速解析可能

## レシピ解析フロー（更新）

```
URL → HTML Fetch → JSON-LD抽出 → [成功?]
                                  ├─ Yes → 食材マッチング → ParsedRecipe
                                  └─ No  → Jina Reader → Gemini → 食材マッチング → ParsedRecipe
```

## 解析関連ファイル構成

```
src/
├── lib/
│   ├── llm/
│   │   ├── gemini-client.ts        # Gemini 2.5 Flash クライアント
│   │   ├── recipe-schema.ts        # Zodスキーマ定義
│   │   └── extract-recipe.ts       # LLM抽出（generateText使用）
│   ├── scraper/
│   │   ├── jina-reader.ts          # Jina Reader APIラッパー
│   │   ├── html-fetcher.ts         # HTML直接フェッチ
│   │   └── json-ld-extractor.ts    # JSON-LD抽出ロジック
│   └── recipe/
│       ├── parse-recipe.ts         # オーケストレータ（JSON-LD優先→Jina+Geminiフォールバック）
│       └── match-ingredients.ts    # 食材マッチングロジック
├── types/
│   └── json-ld.ts                  # JSON-LD型定義（schema-dts使用）
└── hooks/
    └── use-selected-ingredients.ts # 選択済み食材取得フック
```

## コミット履歴（直近）
```
f2bed62 Fix ingredient name display in selector
e9c6d24 Fix sourceName to use publisher instead of author
8c3aa2e Replace deprecated generateObject with generateText
eefb1fa Refactor json-ld-extractor to reduce complexity
3bb6960 Add JSON-LD extraction for recipe parsing
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド
- `src/lib/scraper/` - スクレイピング（Jina Reader, JSON-LD）
- `src/lib/llm/` - LLM関連（Gemini）
- `src/lib/recipe/` - レシピ解析・食材マッチング
