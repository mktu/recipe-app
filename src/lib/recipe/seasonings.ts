import { normalizeSearchKey } from '@/lib/search/normalize'

/** 検索対象外とする調味料・基礎食材・お菓子材料 */
const SEASONING_KEYWORDS = [
  // 基本調味料
  '塩', '砂糖', 'グラニュー糖', '醤油', 'しょうゆ', 'みりん', '酒', '料理酒',
  '油', 'サラダ油', 'ごま油', 'オリーブオイル', 'オリーブ油',
  '酢', '味噌', 'みそ', 'だし', '出汁', 'ダシ', 'めんつゆ',
  'マヨネーズ', 'ケチャップ', 'ソース', 'ウスターソース',
  'こしょう', 'コショウ', '胡椒', '塩こしょう', '黒こしょう',
  '片栗粉', '薄力粉', '強力粉', '小麦粉', 'パン粉',
  'コンソメ', 'ブイヨン', '鶏ガラスープ',
  'ねぎ刻み', '細ねぎ', '細ねぎ刻み',
  // 辛味調味料
  '豆板醤', 'コチュジャン', 'はちみつ',
  // お菓子材料
  'ホットケーキミックス', 'ベーキングパウダー', 'ココアパウダー', 'ビスケット',
  // その他
  'お湯', '水',
]

/** 照合キー化した調味料キーワード（かな/カナ・全角半角の揺れを吸収するため事前変換） */
const SEASONING_KEYS = SEASONING_KEYWORDS.map(normalizeSearchKey)

export function isSeasoning(name: string): boolean {
  const normalized = normalizeSearchKey(name)
  return SEASONING_KEYS.some((kw) => normalized.includes(kw))
}
