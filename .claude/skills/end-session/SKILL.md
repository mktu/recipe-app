---
name: end-session
description: セッション終了前に doc 追従を確認し、用済みの worktree を片付ける
---

# セッション終了

**進捗・完了タスクは Issue / PR / commit に記録する（このセッションで済ませておく）。**
end-session でやるのは「doc の追従漏れチェック」と「worktree の後片付け」の2つだけ。

かつての `SESSION.md` は廃止済み。完了タスクのログを書き足す場所は無い（履歴は Issue/PR が正本）。

## 1. ドキュメント更新チェック

`git diff origin/develop...HEAD --name-only` でセッション中の変更ファイルを確認し、
以下の対応表に基づいて更新漏れのドキュメントがないか確認する。問題なければスキップ。

| 変更されたファイル | 確認すべきドキュメント |
|---|---|
| `supabase/migrations/` | `docs/DATABASE_DESIGN.md`, `docs/ARCHITECTURE.md` |
| `supabase/functions/`, `src/lib/batch/` | `docs/EDGE_FUNCTIONS.md`, `docs/ARCHITECTURE.md` |
| `src/lib/line/` | `docs/ARCHITECTURE.md`, `docs/LINE_SETUP.md` |
| `src/app/api/` | `docs/ARCHITECTURE.md`（API 構成セクション） |
| `.github/workflows/` | `docs/OPERATIONS.md` |
| `scripts/setup-cron.ts` | `docs/EDGE_FUNCTIONS.md` |

### 新しく判明した gotcha があれば docs に書く

「コードだけからは分からない」ことがセッション中に判明したら、docs に残す。
置き場所は CLAUDE.md の「ドキュメント > 知見を書く場所」に従う。行き先が無ければ `docs/OPERATIONS.md`。

更新が必要なドキュメントがあれば、コミット前にユーザーに確認する。

## 2. 作業のコミットと PR

未コミットの変更があればコミットする。PR がまだなら `/create-pr` で作成する
（**`--base develop` が必須**）。

## 3. worktree を片付けるか判断する

```bash
git worktree list
```

worktree で作業していた場合、または前のセッションの worktree が残っている場合、
**それぞれについて削除可否を判定する**。

```bash
# 未コミット・未 push が無いか
git -C <path> status --porcelain
git -C <path> log --oneline origin/<branch>..HEAD

# PR の状態
gh pr list --head <branch> --state all --json number,state,mergedAt
```

| 状態 | 判断 |
|---|---|
| PR がマージ済み・未コミットなし | **削除する** |
| PR が open（レビュー待ち） | **残す**。マージ後の次セッションで削除 |
| 未コミット、または未 push のコミットあり | **残す**。ユーザーに内容を報告する |

**削除は必ずユーザーに確認してから実行する。**

このセッションが worktree の中にいる場合は `ExitWorktree` ツールで抜ける
（`action: "remove"` で削除、`action: "keep"` で残す）。
外から他の worktree を消す場合:

```bash
git worktree remove .claude/worktrees/<name>
git branch -d feature/<xxx>       # マージ済みブランチのローカル参照も消す
git worktree prune
```

## 4. 終了案内

以下を報告して終わる。

- doc 追従の確認結果
- 作成/更新した PR
- worktree の処理結果（削除した / 残した理由）

最後に「`/clear` でセッションを終了してください。」と表示する。
