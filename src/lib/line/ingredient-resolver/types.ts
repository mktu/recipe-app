/**
 * 食材解決の結果
 */
export interface ResolvedIngredient {
  id: string
  name: string
}

/**
 * 食材名を食材IDに解決するインターフェース
 *
 * 実装を差し替えることで、検索方式を変更可能:
 * - MemoryResolver: メモリ上のMapで検索（現在の実装）
 * - SqlResolver: SQLのJOINで検索（将来の選択肢）
 * - CachedResolver: キャッシュ付きResolver（将来の選択肢）
 */
export interface IngredientResolver {
  /**
   * 単語を食材IDに解決する
   * @param word 検索する単語（例: "玉ねぎ", "タマネギ"）
   * @returns マッチした食材、見つからない場合はnull
   */
  resolve(word: string): Promise<ResolvedIngredient | null>
}
