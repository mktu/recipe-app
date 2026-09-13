import { createServerClient } from '@/lib/db/client'
import { getUserIdByLineUserId } from '@/lib/db/queries/users'
import type { Json } from '@/types/database'
import type {
  CreateRecipeNoteInput,
  UpdateRecipeNoteInput,
  UnmatchedIngredient,
} from '@/types/recipe'

export interface RecipeNoteResult {
  noteId: string
  recipeId: string
}

export interface RecipeNoteError {
  message: string
  code?: string
}

/**
 * RPC が返す行。生成型は null 許容を落とすため、既存の RPC 呼び出しと同じく
 * 呼び出し側でローカルに定義して手で詰め替える。
 */
type CreateRecipeNoteRow = {
  note_id: string | null
  recipe_id: string | null
}

/** unmatched を RPC が受け取る snake_case の JSON に変換する */
function toUnmatchedJson(unmatched: UnmatchedIngredient[] | undefined): Json {
  const rows = (unmatched ?? []).map(({ rawName, normalizedName }) => ({
    raw_name: rawName,
    normalized_name: normalizedName,
  }))
  return rows as unknown as Json
}

function toRecipeNoteError(err: unknown): RecipeNoteError {
  if (err && typeof err === 'object' && 'code' in err) {
    const pgError = err as { code: string; message?: string }
    return { message: pgError.message || 'Database error', code: pgError.code }
  }
  return { message: err instanceof Error ? err.message : 'Unknown error' }
}

/**
 * 作成・更新で共通の RPC 引数を組み立てる。
 *
 * RPC 側の任意引数は `DEFAULT NULL` なので、ここで落とした項目は NULL で上書きされる。
 * 更新時の取りこぼしを防ぐのは `UpdateRecipeNoteInput` 側の必須化（null を明示させる）。
 */
type NoteRpcArgsInput = Omit<
  CreateRecipeNoteInput,
  'lineUserId' | 'imageKey' | 'servings' | 'memo' | 'cookingTimeMinutes'
> & {
  imageKey?: string | null
  servings?: string | null
  memo?: string | null
  cookingTimeMinutes?: number | null
}

function buildNoteRpcArgs(input: NoteRpcArgsInput, userId: string) {
  return {
    p_user_id: userId,
    p_title: input.title,
    p_ingredients: input.ingredients as unknown as Json,
    p_steps: input.steps as unknown as Json,
    p_ingredient_ids: input.ingredientIds,
    p_unmatched: toUnmatchedJson(input.unmatchedIngredients),
    p_image_key: input.imageKey ?? undefined,
    p_servings: input.servings ?? undefined,
    p_memo: input.memo ?? undefined,
    p_cooking_time_minutes: input.cookingTimeMinutes ?? undefined,
  }
}

/**
 * ノート行と図鑑のレシピ行を対で作成する。
 *
 * 書き込みは RPC 側の単一トランザクションにまとまっているため、途中で失敗しても
 * 片方だけ残ることはない。`recipes.url` には RPC が `/notes/<note_id>` を入れる。
 */
export async function createRecipeNote(
  input: CreateRecipeNoteInput
): Promise<{ data: RecipeNoteResult | null; error: RecipeNoteError | null }> {
  const client = createServerClient()

  try {
    const userId = await getUserIdByLineUserId(client, input.lineUserId)
    if (!userId) return { data: null, error: { message: 'ユーザーが見つかりません' } }

    const { data, error } = await client.rpc('create_recipe_note', buildNoteRpcArgs(input, userId))
    if (error) throw error

    const row = (data as CreateRecipeNoteRow[] | null)?.[0]
    if (!row?.note_id || !row?.recipe_id) {
      return { data: null, error: { message: 'レシピノートの作成に失敗しました' } }
    }

    return { data: { noteId: row.note_id, recipeId: row.recipe_id }, error: null }
  } catch (err: unknown) {
    console.error('[createRecipeNote] Error:', err)
    return { data: null, error: toRecipeNoteError(err) }
  }
}

/**
 * ノートを更新し、図鑑のレシピ行へ書き戻す。
 *
 * **全項目の置き換え**であり、部分更新ではない。`UpdateRecipeNoteInput` は
 * 画像・分量・メモ・調理時間も必須にしてあるので、消したい場合だけ `null` を渡す。
 *
 * タイトルが変わった場合は RPC 側で `title_embedding` を NULL に落とすため、
 * generate-embeddings が次回実行時に拾い直す。
 */
export async function updateRecipeNote(
  input: UpdateRecipeNoteInput
): Promise<{ error: Error | null }> {
  const client = createServerClient()

  try {
    const userId = await getUserIdByLineUserId(client, input.lineUserId)
    if (!userId) return { error: new Error('ユーザーが見つかりません') }

    const { error } = await client.rpc('update_recipe_note', {
      ...buildNoteRpcArgs(input, userId),
      p_note_id: input.noteId,
    })
    if (error) throw error

    return { error: null }
  } catch (err) {
    console.error('[updateRecipeNote] Error:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
