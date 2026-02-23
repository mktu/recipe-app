import { generateText, Output } from 'ai'
import { geminiFlash } from './gemini-client'
import { recipeExtractionSchema, RecipeExtraction } from './recipe-schema'

const INGREDIENT_MASTER_LIST = [
  'なす',
  'きゅうり',
  'トマト',
  'にんじん',
  'たまねぎ',
  'じゃがいも',
  'さつまいも',
  'かぼちゃ',
  'だいこん',
  'かぶ',
  'れんこん',
  'ごぼう',
  'ながいも',
  'さといも',
  'キャベツ',
  'はくさい',
  'レタス',
  'ほうれんそう',
  'こまつな',
  'チンゲンサイ',
  'みずな',
  'もやし',
  'ブロッコリー',
  'カリフラワー',
  'アスパラガス',
  'セロリ',
  'ねぎ',
  'にら',
  'にんにく',
  'しょうが',
  'ピーマン',
  'パプリカ',
  'とうがらし',
  'ズッキーニ',
  'ゴーヤ',
  'オクラ',
  'さやいんげん',
  'さやえんどう',
  'スナップえんどう',
  'そらまめ',
  'えだまめ',
  'とうもろこし',
  'たけのこ',
  'みょうが',
  'しそ',
  'みつば',
  'パセリ',
  'バジル',
  'パクチー',
  'かいわれだいこん',
  'しいたけ',
  'しめじ',
  'えのき',
  'まいたけ',
  'エリンギ',
  'マッシュルーム',
  'なめこ',
  'きくらげ',
  '鶏肉',
  '鶏むね肉',
  '鶏もも肉',
  '鶏ささみ',
  '鶏手羽',
  '鶏ひき肉',
  '豚肉',
  '豚バラ肉',
  '豚ロース',
  '豚こま肉',
  '豚ひき肉',
  '牛肉',
  '牛こま肉',
  '牛ひき肉',
  '合いびき肉',
  'ベーコン',
  'ハム',
  'ソーセージ',
  'ラム肉',
  '鮭',
  'さば',
  'さんま',
  'あじ',
  'いわし',
  'ぶり',
  'まぐろ',
  'かつお',
  'たら',
  'たい',
  'さわら',
  'ほっけ',
  'めかじき',
  'えび',
  'いか',
  'たこ',
  'あさり',
  'しじみ',
  'ほたて',
  'かに',
  'ちくわ',
  'かまぼこ',
  'さつまあげ',
  'ツナ缶',
  'しらす',
  'たらこ',
  '明太子',
  'たまご',
  'うずらのたまご',
  '牛乳',
  '生クリーム',
  'バター',
  'チーズ',
  'ヨーグルト',
  '豆腐',
  '絹ごし豆腐',
  '木綿豆腐',
  '厚揚げ',
  '油揚げ',
  'がんもどき',
  '納豆',
  'おから',
  '豆乳',
  '大豆',
  '高野豆腐',
  'ごはん',
  'もち',
  'うどん',
  'そば',
  'そうめん',
  '中華麺',
  'パスタ',
  '食パン',
  '春雨',
  'ビーフン',
  'こんにゃく',
  'しらたき',
  'わかめ',
  'ひじき',
  'のり',
  '昆布',
  '切り干しだいこん',
  '干ししいたけ',
  '梅干し',
  'キムチ',
  '餃子の皮',
  '春巻きの皮',
  'アボカド',
  'レモン',
  'りんご',
  'バナナ',
  'くるみ',
  'アーモンド',
  'ごま',
]

function buildPrompt(content: string, sourceUrl: string): string {
  const ingredientList = INGREDIENT_MASTER_LIST.join(', ')
  const truncatedContent = content.slice(0, 8000)

  return `あなたはレシピ情報を抽出する専門のAIアシスタントです。
以下のWebページコンテンツからレシピ情報を抽出してください。

## 抽出ルール
1. レシピ名: ページのメインタイトルを使用
2. 元サイト名: ドメインから推測（例: cookpad.com → クックパッド）
3. メイン食材:
   - 調味料を除外（塩、醤油、砂糖、みりん、酒、油、だし、酢、味噌、マヨネーズ、ケチャップ、ソース等）
   - 主要な食材のみ抽出（最大5つ）
   - 可能な限り以下のリストの表記に合わせる
4. 画像URL: メイン料理画像の絶対URL（見つからない場合は空文字）
5. 調理時間: 分単位の整数で返す（「30分」→30、「1時間」→60、「1時間30分」→90）。不明な場合は null

## 参照用食材リスト
${ingredientList}

## URL
${sourceUrl}

## コンテンツ
${truncatedContent}`
}

export async function extractRecipeInfo(
  content: string,
  sourceUrl: string
): Promise<RecipeExtraction> {
  const { output } = await generateText({
    model: geminiFlash,
    output: Output.object({ schema: recipeExtractionSchema }),
    prompt: buildPrompt(content, sourceUrl),
  })

  if (!output) {
    throw new Error('Failed to extract recipe info: no output')
  }

  return output
}
