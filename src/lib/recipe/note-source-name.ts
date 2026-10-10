/**
 * ノート経由のレシピの `recipes.source_name`。
 * **値を決めているのは `create_recipe_note` RPC（SQL）側**で、ここは LINE のカードに出すための写し。
 * 変えるときは migration の RPC と両方を変えること。
 *
 * DB クライアントを import しないファイルに置いている（単体テストから読めるように）
 */
export const NOTE_SOURCE_NAME = 'マイレシピ'
