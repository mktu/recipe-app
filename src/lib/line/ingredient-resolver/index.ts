export type { IngredientResolver, ResolvedIngredient } from './types'
export { createMemoryResolver } from './memory-resolver'

// デフォルトのResolver
// 将来的に実装を切り替える場合はここを変更
export { createMemoryResolver as createDefaultResolver } from './memory-resolver'
