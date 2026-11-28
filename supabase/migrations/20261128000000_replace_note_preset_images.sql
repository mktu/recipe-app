-- 既存のプリセット画像のマイレシピを AI 画像に置き換える（#292）
--
-- プリセット（image_key）を選んであるノートの image_key を外し、AI 画像の生成対象（pending）にする。
-- 生成は generate-note-images の cron（5 分ごと）が拾う。終わるまでと失敗したときは、表示側が表紙を出す。
--
-- note_image_url() は「プリセット → AI 画像」の順なので、image_key を残したまま pending にしても
-- できた AI 画像はプリセットに負けて表示されない。だから image_key を消す。
--
-- image_key 列・RPC の p_image_key 引数・note_placeholder_image_url はまだ消さない。
-- migration（GitHub Actions）とアプリ（Vercel）のデプロイは並行で順番が決まっておらず、
-- 列を先に消すと、古いアプリの select（image_key を含む）が落ちる。本番に出たあとの別の migration で消す

WITH replaced AS (
  UPDATE recipe_notes SET
    image_key = NULL,
    image_status = 'pending',
    image_retry_count = 0,
    image_generation_started_at = NULL
  WHERE image_key IS NOT NULL
  RETURNING recipe_id, generated_image_url
)
UPDATE recipes r
SET image_url = note_image_url(NULL, replaced.generated_image_url)
FROM replaced
WHERE r.id = replaced.recipe_id;
