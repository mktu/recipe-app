import { buildIngredientIndex, type AliasRecord, type IngredientRecord } from './ingredient-index'

/** 本番の食材マスタから代表的なものを抜き出したテスト用データ */
const INGREDIENTS: Array<[id: string, name: string, category: string, parent?: string]> = [
  ['v1', 'たまねぎ', '野菜'],
  ['v2', 'じゃがいも', '野菜'],
  ['v3', 'なす', '野菜'],
  ['v4', 'もやし', '野菜'],
  ['v5', 'トマト', '野菜'],
  ['v6', 'ミニトマト', '野菜', 'v5'],
  ['v7', '長ねぎ', '野菜'],
  ['v8', 'さつまいも', '野菜'],
  ['k1', 'しいたけ', 'きのこ'],
  ['k2', 'しめじ', 'きのこ'],
  ['m1', '鶏肉', '肉'],
  ['m2', '鶏むね肉', '肉', 'm1'],
  ['m3', '鶏もも肉', '肉', 'm1'],
  ['m4', '豚肉', '肉'],
  ['m5', '豚バラ肉', '肉', 'm4'],
  ['m6', '豚こま切れ肉', '肉', 'm4'],
  ['m7', '牛肉', '肉'],
  ['m8', 'ベーコン', '肉'],
  ['f1', '鮭', '魚介'],
  ['f2', 'えび', '魚介'],
  ['d1', '牛乳', '卵・乳製品'],
  ['d2', 'チーズ', '卵・乳製品'],
  ['t1', '豆腐', '豆腐・大豆製品'],
  ['t2', '大豆', '豆腐・大豆製品'],
]

const ALIASES: Array<[alias: string, ingredientId: string]> = [
  ['玉ねぎ', 'v1'],
  ['タマネギ', 'v1'],
  ['豚こま', 'm6'],
  ['とりもも', 'm3'],
  ['チキン', 'm1'],
  ['ねぎ', 'v7'],
  ['サーモン', 'f1'],
]

const ingredientRecords: IngredientRecord[] = INGREDIENTS.map(([id, name, category, parent]) => ({
  id,
  name,
  category,
  parentId: parent ?? null,
}))

const aliasRecords: AliasRecord[] = ALIASES.map(([alias, ingredientId]) => ({ alias, ingredientId }))

export const testIndex = buildIngredientIndex(ingredientRecords, aliasRecords)
