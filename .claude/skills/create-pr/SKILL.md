---
name: create-pr
description: feature ブランチから develop への PR を作成する（--base develop を強制）
---

# PR 作成

feature ブランチから PR を作成する。
ベースブランチはユーザーに確認し、未指定の場合は `develop` をデフォルトとする。

## 1. 事前確認

```bash
git branch --show-current
```

- `feature/*` ブランチにいることを確認する
- `develop` や `main` にいる場合はユーザーに警告して中断する

## 2. 変更内容を把握

以下を並行して実行し、PR の内容を把握する：

```bash
git log develop..HEAD --oneline
git diff develop...HEAD --stat
```

## 3. PR タイトル・本文を作成

コミット内容と変更ファイルから PR タイトル・本文を起草する。

**タイトル規則:**
- 70文字以内
- `feat:`, `fix:`, `refactor:`, `docs:` などのプレフィックスを付ける
- Issue 番号がある場合は末尾に `（Issue #XX）` を付ける

**本文テンプレート:**

```markdown
## Summary

- 変更点を箇条書き

## Test plan

- [ ] テスト項目1
- [ ] テスト項目2

Closes #XX

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## 4. リモートへ push

```bash
git push -u origin <branch-name>
```

## 5. ベースブランチの確認

PR を作成する前に、ユーザーにベースブランチを確認する：

> 「ベースブランチを教えてください（デフォルト: `develop`）」

ユーザーが何も指定しなければ `develop` を使用する。

## 6. PR 作成

確認したベースブランチを指定して PR を作成する：

```bash
gh pr create --base <base-branch> --title "<タイトル>" --body "$(cat <<'EOF'
<本文>
EOF
)"
```

## 7. PR URL を表示

作成した PR の URL をユーザーに提示する。
