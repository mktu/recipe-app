/**
 * レシピノートのプレースホルダー画像を生成する（Issue #174）
 *
 * 使い方: npm run generate:placeholders
 * 出力先: public/placeholders/<key>.png（生成物もコミットする）
 *
 * 料理のイラストではなく、ジャンルの記号（線画）＋背景色にしている。
 * 具体的な料理を描くと、別の料理のノートに付けたときにタイトルと絵が食い違うため。
 * 厳密に合っている必要はなく、「これかな？」と選べる手がかりになれば十分という位置付け。
 *
 * 描画の規則（揃えておくと並べたときに統一感が出る）:
 * - キャンバス 1024x572（LINE の hero 20:13・詳細の 16:9 どちらにも切り抜ける）
 * - アイコンは中央 (512, 262) 付近、中央の正方形（x=226〜798）の内側に描く。一覧は正方形に切り抜くため
 * - 線幅 10・端と角は丸め。背景は淡色、線はその同系色を濃くした色
 */
import sharp from 'sharp'
import path from 'path'
import type { PlaceholderImageKey } from '../src/lib/recipe/placeholder-images'

const WIDTH = 1024
const HEIGHT = 572
const CENTER = '512 262'
const STROKE_WIDTH = 10
const OUT_DIR = path.join(__dirname, '../public/placeholders')

interface Icon {
  bg: string
  fg: string
  /** SVG の path 等。fill="none" の stroke で描かれる */
  body: string
  /** 中心基準の拡大率。線幅は変えずに形だけ大きくする */
  scale?: number
  text?: string
}

/** 候補のキー全部＋画像なし用。候補を足したら、ここに描かないと型エラーになる */
const ICONS: Record<PlaceholderImageKey | 'default', Icon> = {
  // おにぎり
  japanese: {
    bg: '#E3E9F3', fg: '#8C9DBE',
    body: `
      <path d="M512 150 C548 150 640 290 640 330 C640 362 616 372 512 372 C408 372 384 362 384 330 C384 290 476 150 512 150 Z"/>
      <path d="M452 372 V300 H572 V372"/>`,
  },
  // 交差したフォークとナイフ（形は default と同じものを回転させている）
  western: {
    bg: '#EEE8F4', fg: '#A897C2', scale: 1.15,
    body: `
      <path transform="rotate(-42 ${CENTER})" d="M490 150v56a22 22 0 0 0 44 0v-56M512 150v222"/>
      <path transform="rotate(42 ${CENTER})" d="M529 372V150c-26 16-34 54-34 92h34"/>`,
  },
  // 中華鍋と宙に舞う具・炎
  chinese: {
    bg: '#F8E5DF', fg: '#D19587', scale: 1.05,
    body: `
      <path d="M412 280 H612 C612 336 572 364 512 364 C452 364 412 336 412 280 Z"/>
      <path d="M612 292 L686 262"/>
      <circle cx="474" cy="206" r="10"/>
      <circle cx="530" cy="176" r="10"/>
      <circle cx="582" cy="212" r="10"/>
      <path d="M470 392 c-8 -10 8 -16 0 -26 M512 392 c-8 -10 8 -16 0 -26 M554 392 c-8 -10 8 -16 0 -26"/>`,
  },
  // 丼と、箸で持ち上げた麺
  noodle: {
    bg: '#FBEFC9', fg: '#CDAE62', scale: 1.1,
    body: `
      <path d="M382 268 H642 C642 330 590 370 512 370 C434 370 382 330 382 268 Z"/>
      <path d="M478 370 V382 H546 V370"/>
      <path d="M482 268 c-12 -18 12 -36 0 -54 c-12 -18 12 -36 0 -54"/>
      <path d="M512 268 c-12 -18 12 -36 0 -54 c-12 -18 12 -36 0 -54"/>
      <path d="M542 268 c-12 -18 12 -36 0 -54 c-12 -18 12 -36 0 -54"/>
      <path d="M430 150 L610 132"/>
      <path d="M432 172 L612 166"/>`,
  },
  // 両手鍋と湯気
  soup: {
    bg: '#FBE7D5', fg: '#D9A276', scale: 1.15,
    body: `
      <path d="M412 262 H612 V304 C612 346 578 370 512 370 C446 370 412 346 412 304 Z"/>
      <path d="M412 280 H386 C372 280 372 306 386 306 H414"/>
      <path d="M612 280 H638 C652 280 652 306 638 306 H610"/>
      <path d="M472 232 c-12 -16 12 -30 0 -46"/>
      <path d="M512 232 c-12 -16 12 -30 0 -46"/>
      <path d="M552 232 c-12 -16 12 -30 0 -46"/>`,
  },
  // ボウルと葉
  salad: {
    bg: '#E9F3DC', fg: '#8FB26C', scale: 1.1,
    body: `
      <path d="M382 282 H642 C642 338 590 370 512 370 C434 370 382 338 382 282 Z"/>
      <path d="M430 282 C416 244 432 214 462 206 C470 236 462 262 452 282"/>
      <path d="M492 282 C480 236 500 196 540 184 C552 222 540 258 522 282"/>
      <path d="M556 282 C556 250 578 226 610 226 C612 252 598 272 580 282"/>`,
  },
  // いちごのショートケーキ
  dessert: {
    bg: '#F9E5EC', fg: '#D596AB', scale: 1.1,
    body: `
      <path d="M392 364 V270 L632 230 V364 Z"/>
      <path d="M392 318 L632 296"/>
      <path d="M392 270 c20 -16 40 4 60 -10 c20 -14 40 4 60 -10 c20 -14 40 4 60 -10 c20 -14 40 4 60 -10"/>
      <circle cx="594" cy="198" r="22"/>
      <path d="M580 176 l14 8 l14 -8"/>`,
  },
  // 画像なし: お皿とフォーク・ナイフ。無地だと読み込み失敗と区別がつかないため文字も添える
  default: {
    bg: 'rgb(250,245,227)', fg: '#CDBB9F',
    body: `
      <circle cx="512" cy="262" r="118"/><circle cx="512" cy="262" r="82"/>
      <path d="M334 170v56a22 22 0 0 0 44 0v-56M356 170v186"/>
      <path d="M690 356V170c-26 16-34 54-34 92h34"/>`,
    text: 'NO IMAGE',
  },
}

function toSvg({ bg, fg, body, scale = 1, text }: Icon): string {
  const label = text
    ? `<text x="512" y="452" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="bold" letter-spacing="6" fill="${fg}">${text}</text>`
    : ''
  const transform = `translate(${CENTER}) scale(${scale}) translate(-512 -262)`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="${bg}"/>
<g fill="none" stroke="${fg}" stroke-width="${STROKE_WIDTH / scale}" stroke-linecap="round" stroke-linejoin="round" transform="${transform}">${body}</g>
${label}
</svg>`
}

async function main() {
  for (const [key, icon] of Object.entries(ICONS)) {
    const file = path.join(OUT_DIR, `${key}.png`)
    const info = await sharp(Buffer.from(toSvg(icon)))
      .png({ palette: true, compressionLevel: 9 })
      .toFile(file)
    console.log(`${key}.png  ${Math.round(info.size / 1024)}KB`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
