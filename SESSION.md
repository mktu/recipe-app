# セッション引き継ぎ

## 最終更新
2026-01-29 (未マッチ食材の記録機能追加)

## 現在のフェーズ
フェーズ 2：AI パース (Jina Reader + Gemini) - 完了

## 直近の完了タスク
- [x] **未マッチ食材の記録テーブル追加**
  - `unmatched_ingredients` テーブルを作成
  - マッチしない食材を `ingredients` に追加せず記録のみ
  - `raw_name`, `normalized_name`, `recipe_id` を保存
- [x] **アンマッチ解析スクリプト追加**
  - `./scripts/check-ingredient-match-rate.sh`
  - マッチ率と未マッチ食材TOP20を表示
  - 「アンマッチ解析して」で実行可能（CLAUDE.mdに記載）

## 進行中のタスク
なし

## 次にやること（優先度順）

### 食材マッチング改善（アンマッチ率 79.7%）
- [ ] **基本調味料の扱いを決定**
  - 砂糖、サラダ油、ごま油、しょうゆ等がマスターにない
  - 選択肢: (A) マスターに追加 / (B) 調味料は検索対象外に
- [ ] **エイリアス登録**
  - 「すりおろしニンニク」→「にんにく」
  - 「料理酒」→「酒」など
- [ ] **正規化ルール改善**
  - 「しょうゆ 1と1/2」のように数字が残るケースあり

### 将来の改善
- [ ] LLMフォールバック（ルールベースでマッチしない場合）

## ブロッカー・注意点
- ローカル開発時は `supabase start` で起動が必要
- Docker が必要（約 2GB のディスク使用）
- **Gemini API無料枠:** `gemini-2.5-flash` を使用（20 requests/day程度）
- **DB型更新時:** `supabase gen types typescript --local > src/types/database.ts` を実行

## アーキテクチャ（食材マッチング）

```
LLM出力 → 正規化 → マッチング試行
                    ├─ Step 1: エイリアス検索
                    ├─ Step 2: 完全一致
                    ├─ Step 3: 部分一致
                    └─ Step 4: 未マッチ → unmatched_ingredients に記録
```

## コミット履歴（直近）
```
801ab1d docs: add custom command for unmatch analysis
d9afd9c Add script to check ingredient match rate
921c123 feat: record unmatched ingredients instead of auto-creating
b5c86eb Update SESSION.md for session handoff
4cca0ba Relax ESLint rules for test files
```

## GitHubリポジトリ
https://github.com/mktu/recipe-app

## 参照すべきファイル
- `requirements.md` - プロジェクト要件定義
- `CLAUDE.md` - 開発ルール・ガイド（カスタムコマンド追加）
- `src/lib/recipe/match-ingredients.ts` - 食材マッチングロジック
- `scripts/check-ingredient-match-rate.sh` - アンマッチ解析スクリプト
- `supabase/migrations/20260128000000_unmatched_ingredients.sql` - 未マッチテーブル
