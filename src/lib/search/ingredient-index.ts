/**
 * 食材マスタ・エイリアスのインメモリ索引
 *
 * DB アクセスは含まない（取得済みの行を渡す）。
 * Edge Function にもコピーされるため相対 import のみ。
 */

import { normalizeSearchKey } from './normalize'

export interface IngredientRecord {
  id: string
  name: string
  category: string
  parentId: string | null
}

export interface AliasRecord {
  alias: string
  ingredientId: string
}

export interface IngredientIndex {
  all: IngredientRecord[]
  byId: Map<string, IngredientRecord>
  /** 正規化キー（マスタ名・エイリアス）→ 食材ID */
  exactMap: Map<string, string>
  /** 正規化キー（カテゴリ名・その区切り単位）→ 食材ID[] */
  categoryMap: Map<string, string[]>
  /** 親食材ID → 子食材ID[] */
  childrenMap: Map<string, string[]>
  /** 部分一致用。マスタ名の正規化キーを短い順に並べたもの */
  nameKeys: Array<{ id: string; key: string }>
}

/** カテゴリ名は「豆腐・大豆製品」のように複合しているので区切って索引する */
function categoryKeys(category: string): string[] {
  const keys = [normalizeSearchKey(category)]
  for (const segment of category.split('・')) {
    const key = normalizeSearchKey(segment)
    if (key && !keys.includes(key)) keys.push(key)
  }
  return keys
}

function addToCategoryMap(map: Map<string, string[]>, key: string, id: string): void {
  const ids = map.get(key)
  if (ids) ids.push(id)
  else map.set(key, [id])
}

/**
 * 食材索引を構築する
 *
 * エイリアスを先に登録してからマスタ名で上書きするため、
 * 正規化後にキーが衝突した場合はマスタ名が優先される。
 */
export function buildIngredientIndex(
  ingredients: IngredientRecord[],
  aliases: AliasRecord[]
): IngredientIndex {
  const byId = new Map<string, IngredientRecord>()
  const exactMap = new Map<string, string>()
  const categoryMap = new Map<string, string[]>()
  const childrenMap = new Map<string, string[]>()

  for (const ing of ingredients) {
    byId.set(ing.id, ing)
    for (const key of categoryKeys(ing.category)) {
      addToCategoryMap(categoryMap, key, ing.id)
    }
    if (ing.parentId) {
      const children = childrenMap.get(ing.parentId)
      if (children) children.push(ing.id)
      else childrenMap.set(ing.parentId, [ing.id])
    }
  }

  for (const a of aliases) {
    if (byId.has(a.ingredientId)) {
      exactMap.set(normalizeSearchKey(a.alias), a.ingredientId)
    }
  }
  const nameKeys = ingredients.map((ing) => ({ id: ing.id, key: normalizeSearchKey(ing.name) }))
  for (const { id, key } of nameKeys) {
    exactMap.set(key, id)
  }
  nameKeys.sort((a, b) => a.key.length - b.key.length)

  return { all: ingredients, byId, exactMap, categoryMap, childrenMap, nameKeys }
}

/** DB の行そのままの形（Bot / Edge Function で共通） */
export interface IngredientRow {
  id: string
  name: string
  category: string
  parent_id: string | null
}

export interface AliasRow {
  alias: string
  ingredient_id: string
}

/**
 * DB の行から索引を構築する
 *
 * Bot と Edge Function で同じ変換を使うためのエントリポイント。
 * 呼び出し側で snake_case → camelCase を書くと取り違えても気付けないので、
 * 変換はここに集約する。
 */
export function buildIngredientIndexFromRows(
  ingredients: IngredientRow[],
  aliases: AliasRow[]
): IngredientIndex {
  return buildIngredientIndex(
    ingredients.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      parentId: r.parent_id,
    })),
    aliases.map((r) => ({ alias: r.alias, ingredientId: r.ingredient_id }))
  )
}

/** 食材IDに子食材IDを加えて展開する（重複除去） */
export function expandWithChildren(index: IngredientIndex, ids: string[]): string[] {
  const expanded = new Set<string>()
  for (const id of ids) {
    expanded.add(id)
    for (const childId of index.childrenMap.get(id) ?? []) {
      expanded.add(childId)
    }
  }
  return Array.from(expanded)
}
