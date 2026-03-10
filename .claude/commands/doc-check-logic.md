docs/ARCHITECTURE.md のフローチャート・説明文が実装コードと意味的に一致しているか検証してください。

## 引数

`$ARGUMENTS` にセクション名が指定されている場合はそのセクションのみ検証してください。
指定がない場合は `git diff main...HEAD` で変更ファイルを確認し、影響するセクションを自動推論してください。

変更がない場合や推論できない場合は、チェック対象セクションをユーザーに確認してください。

## セクションとコードのマッピング

| セクション名 | ドキュメントの対応箇所 | 対応するコードファイル |
|-------------|----------------------|----------------------|
| `auth` | 認証フロー | `src/lib/auth/`, `src/app/api/auth/`, `src/app/api/webhook/line/` |
| `recipe-parse` | レシピ解析フロー | `src/lib/scraper/`, `src/lib/llm/`, `src/app/api/recipes/parse/` |
| `ingredient-matching` | 食材名寄せフロー | `src/lib/recipe/match-ingredients.ts`, `src/lib/batch/` |

## 手順

1. 引数または git diff からチェック対象セクションを決定する
2. 対応するコードファイルを読む
3. ARCHITECTURE.md の該当セクション（フローチャート・説明文）を読む
4. 実装とドキュメントの意味的な差異を報告する（「概ね一致」「ここが違う」を明確に）
5. 「更新して」と言われたら修正を実施する
