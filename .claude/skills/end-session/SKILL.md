---
name: end-session
description: セッション終了前に doc 追従を確認し、SESSION.md の現在地を最新化する
---

# セッション終了

**進捗・完了タスクは Issue / PR / commit に記録する（このセッションで済ませておく）。**
end-session でやるのは「doc の追従漏れチェック」と「SESSION.md の現在地更新」の2つだけ。
完了タスクの詳細ログを SESSION.md に書き足さないこと（履歴は Issue/PR が正本）。

## 1. ドキュメント更新チェック（このスキルの主目的）

`git diff main HEAD --name-only` でセッション中の変更ファイルを確認し、
以下の対応表に基づいて更新漏れのドキュメントがないか確認する。問題なければスキップ。

| 変更されたファイル | 確認すべきドキュメント |
|---|---|
| `supabase/migrations/` | `docs/DATABASE_DESIGN.md`, `docs/ARCHITECTURE.md` |
| `supabase/functions/` | `docs/EDGE_FUNCTIONS.md`, `docs/ARCHITECTURE.md` |
| `src/lib/line/` | `docs/ARCHITECTURE.md` |
| `src/app/api/` | `docs/ARCHITECTURE.md`（API構成セクション） |

更新が必要なドキュメントがあれば、SESSION.md 更新の前にユーザーに確認する。

## 2. SESSION.md の現在地を更新

SESSION.md は履歴ログではなく**現在地ダッシュボード**。以下だけ最新化する：

- **現在のフェーズ**: 変わっていれば更新
- **進行中・次にやること**: 方針レベルの塊のみ（詳細は Issue へ）。着手/完了で変わった Issue 番号を反映
- **横断的な注意点**: 今回のセッションで判明した環境・運用の gotcha があれば追記。解消済みの注意点は削除
- **主要な参照ポインタ**: 非自明なものが増えたら追記

完了タスクの経緯・課題・落とし所は SESSION.md ではなく **Issue コメント / PR 説明**に書くこと。

## 3. コミット

SESSION.md に変更があれば commit する（変わっていなければスキップ）。
feature ブランチ上なら基本はそのまま（PR に含める）でよい。develop に反映したい場合のみ切り替える。

```bash
git add SESSION.md && git commit -m "docs: update SESSION.md dashboard"
```

## 4. 終了案内

「doc 追従を確認し、SESSION.md の現在地を更新しました。`/clear` でセッションを終了してください。」と表示する。
