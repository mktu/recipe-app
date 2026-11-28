# 運用ガイド（開発フロー・CI・環境の gotcha）

実装ドキュメントに行き先がない、横断的な運用上の注意点をここに集約する。
LINE 固有は `docs/LINE_SETUP.md`、Edge Function / cron は `docs/EDGE_FUNCTIONS.md`、
ローカル環境は `docs/SUPABASE_LOCAL.md` を参照。

## 開発フロー

### `Closes #NNN` は develop への PR では発火しない

GitHub が Issue を自動クローズするのは**デフォルトブランチ（main）へマージされたとき**だけ。
本プロジェクトは全 PR が develop 向けなので、**Issue は main マージ後に手動で閉じる**必要がある（`/work-issue` の片付けで閉じる）。
PR 本文に `Closes #NNN` を書くこと自体は紐付けとして有用なので続けてよい。

## CI

### `E2E Tests` の緑は、LINE Bot と設定画面については何も言っていない

E2E が見ているのは LIFF の画面だけ（範囲は `e2e/*.spec.ts`）。**LINE Bot（Webhook・Flex）と設定画面には E2E が無い**ので、
そこを触った PR では緑を品質の根拠にしない。自分で動かして確かめる。

### Supabase CLI は CI でバージョン固定（自動では上がらない）

4 つのワークフロー（`e2e.yml` / `test-migrations.yml` / `supabase-migrate.yml` /
`supabase-functions.yml`）の `supabase/setup-cli` は `version: 2.122.1`（v2 最終）に固定している。
上げるときは**全ワークフローを同時に、リリースノートを読んでから**上げる。
`supabase-migrate.yml` / `supabase-functions.yml` は develop / main へのマージ時にしか走らないため、
CLI の破壊的変更は**本番デプロイの時点で初めて表面化する**。

> 経緯: 以前は `version: latest` で、v3.0.0（2026-11）のリリースで E2E が全 PR で落ちた（#244）。
> v3 は `db push` の既定対象がローカルになる・ホスト変更に `--yes` 必須など、デプロイコマンドにも
> 破壊的変更がある。v3 へ上げる前にこれらへの対応が必要（#245）。

> 注意: `config.toml` は `[local_smtp]`。Supabase の **GitHub 連携（プレビューブランチ）** は
> 2026-11 時点でこのキーを読めず失敗する（supabase/supabase#47616）。今は使っていないが、
> 有効化するならこの問題が解消されているか先に確認する。

### migration とアプリのデプロイは並行で、順番が決まっていない

マージすると、migration は `supabase-migrate.yml`、アプリは Vercel が別々に当てる。どちらが先に終わるかは決まっていない。
**列や RPC の引数を消すときは、アプリが使わなくなった PR が本番に出てから、別の migration で消す。**
同じ PR で消すと、古いアプリが動いている間に、その列を select する箇所などが落ちる（#292）。

### E2E のランナーは `ubuntu-24.04` に固定（`ubuntu-latest` にしない）

`e2e.yml` だけ `runs-on: ubuntu-24.04` に固定している。2026-11 に `ubuntu-latest` が `ubuntu-26.04` に切り替わり、
`npx playwright install --with-deps chromium` が `Playwright does not support chromium on ubuntu26.04-x64` で
失敗して、E2E が全 PR で落ちた（#255 の PR #265 で発覚）。
**外す条件:** `@playwright/test` を 26.04 対応版に上げたとき（`update-packages` スキルで changelog を確認する）。

### Node のバージョンは `.nvmrc` が正本。上げる前に Vercel の対応を確認する

全ワークフローが `node-version-file: '.nvmrc'` を読む。**`node-version: '20'` のような直書きを足さない。**
元々は全部 20 固定で、Node 20 に native WebSocket が無いため `@supabase/supabase-js` の
`createClient()` が `RealtimeClient` の初期化で落ちる、といったズレを踏んだ（#37, #211）。

`.nvmrc` はメジャーのみ（`24`）なので、CI はその系列の最新パッチを自動で使う。
ローカルは `fnm install 24` で追従する。

**メジャーを上げるときは、Vercel の Functions / ビルドが対応しているかを先に確認する**
（[Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)）。
2026-10 時点で Node 26 は Vercel Sandbox のみ対応で、Functions は 24.x までのため 24 に留めた。
`.nvmrc` だけ先に上げると、ローカル・CI と本番がずれる。

### `next build` が `next/font/google` の数百件の Module not found で落ちたら再実行する

`Can't resolve '@vercel/turbopack-next/internal/font/google/font'` が
`noto_sans_jp_*.module.css` に数百件並ぶのは、ビルド時に fonts.gstatic.com から
フォントを取れなかっただけ（一時的なネットワーク失敗）。コードの不具合に見えるが、
**同じコミットの再実行（`gh run rerun <id> --failed`）で通る**（#232 で発生）。
同じ PR の Vercel ビルドが通っていれば、まずこれを疑う。

## フロントエンド（LIFF）

### iOS の WebKit はボタンを押してもフォーカスを与えない（Chromium では再現しない）

**LINE の内蔵ブラウザ（iPhone）は WebKit。** Chromium はボタンのクリックでフォーカスを移すが、WebKit は移さない。
そのため「blur の `relatedTarget` が候補ボタンなら閉じない」のような判定は、iPhone でだけ壊れる
（blur 時の `relatedTarget` が null になり、`onClick` より先に一覧が閉じてタップが空振りする。#176 の材料名サジェスト）。
押下の既定動作を止めてフォーカスを保つ（`onMouseDown={(e) => e.preventDefault()}`）。

**E2E も手元の確認スクリプトも Chromium なので検出できない。** フォーカス・タップまわりを触ったら WebKit で確かめる。

```bash
npx playwright install webkit   # 初回のみ
```

スクリプトで `webkit.launch()` と `devices['iPhone 13']` を使えば再現できる（#176 で、修正前は空振りし修正後は通ることを確認した）。

## デプロイ・ホスティング

### Vercel Preview の Deployment Protection は Off

staging の LINE Webhook を通すため意図的に無効化している。有効化すると
LINE からの POST が認証で弾かれて staging のボットが無反応になる。

### Gemini のクレジットが足りなくなったとき

Gemini API は有料 tier の前払い（Prepay、自動チャージなし）で、**残高がそのまま上限**（#132）。
キー（`GOOGLE_GENERATIVE_AI_API_KEY`）はローカル・staging・本番で共通なので、尽きると全環境の呼び出しが
402（`Your prepayment credits are depleted`）で失敗する。**Google から残高の通知は来ない。**

**気付き方:** AI Studio の Billing で残高を見る。尽きていても登録や画面は普通に動くので、使っていて気付くのは難しい
（LINE の検索で言い換え〔ベクトル検索〕が効かなくなる、マイレシピの画像が表紙のままになる程度）。
Edge Function のログ（`generate-embeddings` / `generate-note-images`）に 402 が出る。

**手順:**

1. AI Studio の Billing でクレジットを買い足す（自動チャージは入れない。入れるなら「1 か月の費用の上限」も一緒に付ける。
   残高が歯止めにならなくなるため）
2. staging と本番の**両方**の SQL Editor で、埋め込みを諦めたレシピを数え、0 件でなければリセットする

   ```sql
   SELECT count(*) FROM recipes WHERE title_embedding IS NULL AND embedding_retry_count >= 3;
   UPDATE recipes SET embedding_retry_count = 0 WHERE title_embedding IS NULL AND embedding_retry_count >= 3;
   ```

   5 分以内に `generate-embeddings` の cron が拾って埋める

   マイレシピの AI 画像（#287）も同じく 3 回で諦める。諦めたものは表紙のまま残るので、作り直すなら戻す
   （月の上限の数は戻らない。cron が 5 分以内に拾う）

   ```sql
   SELECT count(*) FROM recipe_notes WHERE image_status = 'failed';
   UPDATE recipe_notes SET image_status = 'pending', image_retry_count = 0 WHERE image_status = 'failed';
   ```
3. ほかは何もしなくてよい。検索は次の呼び出しから、`auto-alias` は翌日の実行で元に戻る

**2 が要る理由:** 埋め込みのバッチは 402 でもリトライ回数を増やし、3 回（15 分）で諦める。
増やさないと、放置中に cron が 5 分ごとに呼び続けて Disk IO Budget を消費するため（`docs/EDGE_FUNCTIONS.md` の `onlyIf`）。
リセットで残高切れと関係なく失敗していたレシピも戻るが、もう 3 回試されるだけで害は無い。
