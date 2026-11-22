/**
 * LINE Flex Message プレビュー用スクリプト
 *
 * 使い方:
 *   npm run preview:flex           # デフォルト (5件)
 *   npm run preview:flex -- --count=3  # 件数指定
 *
 * 出力された JSON を以下のシミュレーターに貼り付ける:
 *   https://developers.line.biz/flex-simulator/
 */

import type { RecipeCardData } from '../src/lib/line/flex-message'
import { createVerticalListMessage } from '../src/lib/line/vertical-list-message'

const DUMMY_RECIPES: RecipeCardData[] = [
  {
    recipeId: 'dummy-1',
    title: '豚バラ大根の煮物',
    url: 'https://liff.line.me/dummy/recipes/1',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=300&fit=crop',
    sourceName: 'クックパッド',
  },
  {
    recipeId: 'dummy-2',
    title: '鶏むね肉と玉ねぎのさっぱり炒め',
    url: 'https://liff.line.me/dummy/recipes/2',
    imageUrl: 'https://images.unsplash.com/photo-1604908177453-7462950a6a3b?w=300&h=300&fit=crop',
    sourceName: 'デリッシュキッチン',
  },
  {
    recipeId: 'dummy-3',
    title: '肉じゃが',
    url: 'https://liff.line.me/dummy/recipes/3',
    imageUrl: null, // 画像なし（プレースホルダー確認用）
    sourceName: 'クラシル',
  },
  {
    recipeId: 'dummy-4',
    title: '簡単！ガーリックシュリンプ丼',
    url: 'https://liff.line.me/dummy/recipes/4',
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&h=300&fit=crop',
    sourceName: 'みんなのきょうの料理',
  },
  {
    recipeId: 'dummy-5',
    title: 'ほうれん草と卵の中華炒め',
    url: 'https://liff.line.me/dummy/recipes/5',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&h=300&fit=crop',
    sourceName: undefined, // ソース名なし（確認用）
  },
]

function getCount(): number {
  const arg = process.argv.find((a) => a.startsWith('--count='))
  if (!arg) return 5
  const n = parseInt(arg.split('=')[1], 10)
  return isNaN(n) ? 5 : Math.min(Math.max(n, 1), 5)
}

const count = getCount()
const recipes = DUMMY_RECIPES.slice(0, count)
const listUrl = 'https://liff.line.me/dummy'

const message = createVerticalListMessage(recipes, listUrl, recipes.length)
const bubble = message.contents

console.log('━'.repeat(50))
console.log('LINE Flex Message Simulator')
console.log('https://developers.line.biz/flex-simulator/')
console.log('━'.repeat(50))
console.log(`📋 レシピ ${count} 件のプレビュー用 JSON:`)
console.log('━'.repeat(50))
console.log(JSON.stringify(bubble, null, 2))
console.log('━'.repeat(50))
console.log('↑ この JSON をシミュレーターに貼り付けてください')
