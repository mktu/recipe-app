/**
 * `seed-dev-recipes.ts` から呼ぶ、レシピノートの投入・削除（Epic #172）
 *
 * ノートの作成 UI（#175）が無くても閲覧・編集ページ（#176）を確かめられるようにする。
 * 本番と同じく `resolveIngredients` → `create_recipe_note` RPC を通すので、図鑑側の
 * レシピ行・食材バッジ・`image_url` まで実物どおりに作られる。
 *
 * ノートの `recipes.url` は `/notes/<id>` になり seed の URL 接頭辞で見分けられないため、
 * **タイトルの完全一致**で投入済みかを判定する。同じタイトルのノートを手で作っていると
 * `--clean` で巻き込まれる。
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateRecipeNoteInput } from '../src/types/recipe'

type SeedNote = Omit<CreateRecipeNoteInput, 'lineUserId' | 'ingredientIds' | 'unmatchedIngredients'>

const SEED_NOTES: SeedNote[] = [
  {
    title: 'うちの定番 豚こまと玉ねぎの甘辛炒め',
    ingredients: [
      { name: '豚こま切れ肉', amount: '200g' },
      { name: '玉ねぎ', amount: '1個' },
      { name: 'しょうゆ', amount: '大さじ2' },
      { name: 'みりん', amount: '大さじ2' },
    ],
    steps: [
      '玉ねぎはくし切りにする。',
      'フライパンで豚肉を炒め、色が変わったら玉ねぎを加える。',
      'しょうゆとみりんを回し入れ、汁気が少なくなるまで炒める。',
    ],
    imageKey: 'japanese',
    servings: '2人分',
    memo: 'ご飯が進む。玉ねぎは厚めの方が食感が残る。',
    cookingTimeMinutes: 15,
  },
]

const SEED_TITLES = SEED_NOTES.map((n) => n.title)

async function findSeededNoteTitles(admin: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data } = await admin
    .from('recipe_notes')
    .select('title')
    .eq('user_id', userId)
    .in('title', SEED_TITLES)
  return new Set((data ?? []).map((n: { title: string }) => n.title))
}

/** 未投入のノートを作る。env を読み込んだ後に呼ぶこと（`src/lib/db/client` が読み込み時に参照する） */
export async function seedDevNotes(admin: SupabaseClient, userId: string, lineUserId: string) {
  const { resolveIngredients } = await import('../src/lib/recipe/match-ingredients')
  const { createRecipeNote } = await import('../src/lib/db/queries/recipe-notes')

  const existing = await findSeededNoteTitles(admin, userId)
  for (const note of SEED_NOTES.filter((n) => !existing.has(n.title))) {
    const { matched, unmatched } = await resolveIngredients(note.ingredients.map((i) => i.name))
    const { data, error } = await createRecipeNote({
      ...note,
      lineUserId,
      ingredientIds: matched.map((m) => m.ingredientId),
      unmatchedIngredients: unmatched,
    })
    if (error || !data) {
      console.error(`ノートの投入に失敗しました（${note.title}）:`, error?.message)
      continue
    }
    console.log(`  📝 ${note.title}`)
    console.log(`     /recipes/${data.recipeId}  /notes/${data.noteId}`)
  }
}

/** seed のノートを消す。対のレシピ行を消せば CASCADE でノートも消える */
export async function cleanDevNotes(admin: SupabaseClient, userId: string): Promise<number> {
  const { data: notes } = await admin
    .from('recipe_notes')
    .select('recipe_id')
    .eq('user_id', userId)
    .in('title', SEED_TITLES)
  const recipeIds = (notes ?? []).map((n: { recipe_id: string | null }) => n.recipe_id).filter(Boolean)
  if (recipeIds.length === 0) return 0

  const { data } = await admin.from('recipes').delete().in('id', recipeIds).select('id')
  return data?.length ?? 0
}
