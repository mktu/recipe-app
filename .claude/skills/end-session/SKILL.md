---
name: end-session
description: セッションを終了する前に SESSION.md を更新
---

# セッション終了

以下の処理を順番に実行してください：

## 0. ドキュメント更新チェック

`git diff main HEAD --name-only` でセッション中の変更ファイルを確認し、
以下の対応表に基づいて更新漏れのドキュメントがないか確認する。
問題なければスキップ。

| 変更されたファイル | 確認すべきドキュメント |
|---|---|
| `supabase/migrations/` | `docs/DATABASE_DESIGN.md`, `docs/ARCHITECTURE.md` |
| `supabase/functions/` | `docs/EDGE_FUNCTIONS.md`, `docs/ARCHITECTURE.md` |
| `src/lib/line/` | `docs/ARCHITECTURE.md` |
| `src/app/api/` | `docs/ARCHITECTURE.md`（API構成セクション） |
| バックログのエピックに関連する実装をした場合 | 該当の `docs/backlogs/*.md`（タスクの完了状態・実装メモを更新） |

更新が必要なドキュメントがあれば、SESSION.md 更新の前にユーザーに確認する。

## 1. SESSION.md を更新

以下のセクションを最新状態に更新：

- **最終更新**: 現在の日時（YYYY-MM-DD）と簡潔な状態説明
- **現在のフェーズ**: 進行中のフェーズ
- **直近の完了タスク**: 本セッションで完了したタスク
- **進行中のタスク**: まだ完了していないタスク
- **次にやること**: 次セッションでの優先タスク
- **ブロッカー・注意点**: 注意事項や依存関係
- **コミット履歴**: `git log --oneline -5` の結果
- **参照すべきファイル**: 本セッションで編集・参照した重要ファイル

## 2. コミット

```bash
git add SESSION.md && git commit -m "docs: update SESSION.md for session handoff"
```

## 3. 終了案内

以下のメッセージを表示：

「SESSION.md を更新しました。`/clear` でセッションを終了してください。」
