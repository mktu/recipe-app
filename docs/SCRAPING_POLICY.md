# スクレイピング方針

本サービス（RecipeHub）が外部レシピサイトからレシピ情報を取得する際の方針を定める。
法的リスク（著作権・サイト利用規約・robots.txt）への配慮を明文化し、実装との整合を担保する。

> 実装: `src/lib/scraper/`（`html-fetcher.ts` / `json-ld-extractor.ts` / `next-data-extractor.ts` / `ogp-extractor.ts`）

## 取得対象

- 対象ページが**公開している構造化データ**（JSON-LD `schema.org/Recipe` / `__NEXT_DATA__` / OGP）のみを取得する。
- 取得項目は以下のメタデータに限定する:
  - タイトル
  - サイト名（source name）
  - 画像URL（**画像そのものは自サーバーに複製・保存せず、URL を参照するのみ**）
  - 食材名（分量は保存しない。`ingredients_raw` は `amount: ''`）
  - 調理時間
- **調理手順・本文・レシピ写真等の創作的表現は取得・保存しない。**

## アクセス様態

- **ユーザーが登録操作した URL の単発取得のみ**を行う。サイト全体の巡回・クロール・全件取得はしない。
- User-Agent は `RecipeHub-Bot/1.0 (+<APP_URL>; user-requested recipe metadata fetch)` を明示送信する。
  - 用途と問い合わせ経路を明示し、**検出回避（UA 偽装等）は行わない**。
- 同一ホストへのアクセスは最小 1,000ms 間隔に抑える（`html-fetcher.ts` の `throttleHost`）。
- タイムアウトは 15 秒。

## robots.txt に対するスタンス

- 本サービスの取得は「ユーザー起点の単発フェッチ」であり自律巡回クローラーではないが、対象サイトの意向を尊重する。
- **主要対象サイトのレシピ詳細ページが `User-agent: *` で許可されていることを確認済み（2026-07 時点）:**

  | サイト | robots.txt のレシピ詳細ページ | 備考 |
  |--------|------------------------------|------|
  | Cookpad (`cookpad.com`) | 許可（`Allow: /`） | `/print` 等の一部機能パスは Disallow。`anthropic-ai` / `ClaudeBot` / `GPTBot` 等 **AI 収集系 UA は明示ブロック** |
  | Nadia (`oceans-nadia.com`) | 許可 | `/print`・`/image_slide`・`/search` 等が Disallow |
  | Kurashiru (`kurashiru.com`) | 許可 | `/api/` 等が Disallow。`GPTBot` は全面ブロック |

- robots.txt で **Disallow に指定されたパス（`/print` 等）は取得しない。**
- **AI 学習用途のクロールを拒否しているサイト**（Cookpad / Kurashiru 等）の扱い:
  - 本サービスの取得は AI 学習用の巡回ではなく、ユーザー起点のメタデータ取得であるため許可範囲と解する。
  - ただし取得後にタイトル等を Gemini へ送信するため、可能な限り Gemini は**学習に利用されない tier**（有料 / データ利用オフ）を用いる（別途 Issue で確認）。
- robots.txt の内容は変わりうるため、**主要サイトの状況は定期的に再確認**し、本表の「確認時点」を更新する。

## 対象外運用

- robots.txt や利用規約で取得を明確に拒否しているサイト、取得停止の申し入れがあったサイトは対象から外す。
- 403 / 451 を返すサイトへの取得はブロックとみなし、リトライで回避しない（`HtmlFetchError.isBlocked`）。

## 関連ドキュメント

- 利用規約 第5条（著作権）・第6条（レシピサイトの解析について）: `src/components/features/legal/terms-content.tsx`
- プライバシーポリシー §1（収集する情報）・§4（外部サービスとの連携）: `src/components/features/legal/privacy-content.tsx`
- アーキテクチャ（レシピ解析フロー）: `docs/ARCHITECTURE.md`
