/**
 * レシピURL収集スクリプト
 *
 * サイトマップから各レシピサイトのURLを自動収集し、
 * seed/test-recipe-urls.txt に保存する
 *
 * 使用方法:
 *   npx tsx scripts/collect-recipe-urls.ts
 *
 * オプション:
 *   --append  既存のURLリストに追記（デフォルトは上書き）
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const OUTPUT_FILE = path.join(__dirname, '../seed/test-recipe-urls.txt')

interface SiteConfig {
  name: string
  sitemapUrl: string
  urlPattern: RegExp
  count: number
  isGzipped?: boolean
}

const SITES: SiteConfig[] = [
  {
    name: 'Delish Kitchen',
    sitemapUrl: 'https://misc.delishkitchen.tv/sitemaps/sitemap1.xml.gz',
    urlPattern: /https:\/\/delishkitchen\.tv\/recipes\/[^<\s]+/g,
    count: 50,
    isGzipped: true,
  },
  {
    name: 'クラシル',
    sitemapUrl: 'https://www.kurashiru.com/sitemap1.xml',
    urlPattern: /https:\/\/www\.kurashiru\.com\/recipes\/[^<\s]+/g,
    count: 50,
  },
  {
    name: '味の素パーク',
    sitemapUrl: 'https://park.ajinomoto.co.jp/sitemap-pt-recipe_card-2026-01.xml',
    urlPattern: /https:\/\/park\.ajinomoto\.co\.jp\/recipe\/card\/[^<\s]+/g,
    count: 15,
  },
  {
    name: 'みんなのきょうの料理',
    sitemapUrl: 'https://www.kyounoryouri.jp/sitemaps/recipe.xml',
    urlPattern: /https:\/\/www\.kyounoryouri\.jp\/recipe\/[^<\s]+\.html/g,
    count: 15,
  },
  {
    name: '白ごはん.com',
    sitemapUrl: 'https://www.sirogohan.com/sitemap.xml',
    urlPattern: /https:\/\/www\.sirogohan\.com\/recipe\/[a-z0-9-]+\//g,
    count: 10,
  },
]

async function fetchSitemap(config: SiteConfig): Promise<string[]> {
  console.log(`\n📥 ${config.name} からURL取得中...`)

  try {
    let content: string

    if (config.isGzipped) {
      // gzip圧縮されたサイトマップ（大きいファイルは先頭のみ取得）
      content = execSync(
        `curl -s "${config.sitemapUrl}" | gunzip 2>/dev/null | head -c 500000`,
        { encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 }
      )
    } else {
      // 大きいファイルは先頭のみ取得
      content = execSync(
        `curl -s "${config.sitemapUrl}" | head -c 500000`,
        { encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 }
      )
    }

    const matches = content.match(config.urlPattern) || []
    // 重複除去してシャッフル
    const uniqueUrls = [...new Set(matches)]
    const shuffled = uniqueUrls.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, config.count)

    console.log(`   取得: ${selected.length}件 (全${uniqueUrls.length}件中)`)
    return selected
  } catch (error) {
    console.error(`   ❌ エラー: ${error instanceof Error ? error.message : error}`)
    return []
  }
}

function generateManualSection(): string {
  return `
# ========================================
# 手動追加分（クックパッド、楽天レシピ等）
# ========================================
# 以下に手動でURLを追加してください
# 例:
# https://cookpad.com/recipe/1234567
# https://recipe.rakuten.co.jp/recipe/1234567890/
`
}

async function main() {
  const isAppend = process.argv.includes('--append')

  console.log('🔍 レシピURL収集スクリプト')
  console.log('==========================')

  const allUrls: string[] = []
  const stats: { name: string; count: number }[] = []

  // 各サイトからURL収集
  for (const site of SITES) {
    const urls = await fetchSitemap(site)
    allUrls.push(`# ${site.name} (${urls.length}件)`)
    allUrls.push(...urls)
    allUrls.push('') // 空行
    stats.push({ name: site.name, count: urls.length })
  }

  // 手動追加セクション
  allUrls.push(generateManualSection())

  // ファイル出力
  const outputDir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  if (isAppend && fs.existsSync(OUTPUT_FILE)) {
    const existing = fs.readFileSync(OUTPUT_FILE, 'utf-8')
    fs.writeFileSync(OUTPUT_FILE, existing + '\n' + allUrls.join('\n'))
    console.log('\n📝 既存ファイルに追記しました')
  } else {
    const header = `# テスト用レシピURLリスト
# 生成日時: ${new Date().toISOString()}
# 使用方法: npm run test:recipe
#
# このファイルは scripts/collect-recipe-urls.ts で自動生成されます
# 手動でURLを追加する場合は「手動追加分」セクションに記載してください

`
    fs.writeFileSync(OUTPUT_FILE, header + allUrls.join('\n'))
    console.log('\n📝 新規ファイルを作成しました')
  }

  // サマリー表示
  console.log('\n✨ 収集完了')
  console.log('==========================')
  console.log('サイト別件数:')
  let total = 0
  for (const s of stats) {
    console.log(`  ${s.name}: ${s.count}件`)
    total += s.count
  }
  console.log(`  合計: ${total}件`)
  console.log(`\n出力先: ${OUTPUT_FILE}`)
}

main().catch(console.error)
