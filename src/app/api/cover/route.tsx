import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { coverColor, normalizeCoverTitle } from '@/lib/recipe/cover-image'

const SIZE = 600

/** 料理名は JIS 第 2 水準までに絞った同梱フォントで描く（`scripts/subset-cover-font.py`） */
const fontData = readFile(join(process.cwd(), 'assets/fonts/NotoSansJP-Bold-subset.ttf'))

function fontSize(title: string): number {
  const length = Array.from(title).length
  if (length <= 6) return 72
  if (length <= 12) return 60
  if (length <= 24) return 48
  return 40
}

/**
 * GET /api/cover?title=<料理名>
 * 画像の無いレシピの表紙を PNG で返す（#287）
 *
 * LINE のサーバーが取りに来るので認証しない。料理名だけで絵が決まるので、長くキャッシュさせる。
 * 一覧（正方形）・ノートの詳細（16:9）・LINE（20:13）のどれで切り抜かれても読めるよう、文字は中央の帯に収める
 */
export async function GET(request: NextRequest) {
  const title = normalizeCoverTitle(request.nextUrl.searchParams.get('title') ?? '')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: coverColor(title),
          padding: '0 56px',
        }}
      >
        <div
          style={{
            display: 'flex',
            maxHeight: SIZE * 0.5,
            color: 'white',
            fontSize: fontSize(title),
            fontWeight: 700,
            lineHeight: 1.3,
            textAlign: 'center',
            justifyContent: 'center',
          }}
        >
          {title}
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: [{ name: 'Noto Sans JP', data: await fontData, weight: 700, style: 'normal' }],
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    }
  )
}
