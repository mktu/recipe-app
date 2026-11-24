/** プロンプトに載せる材料の数の上限。調味料まで並ぶと、料理の見た目に関係の薄い語でぶれるため */
const MAX_INGREDIENTS = 8

/** recipe_notes.ingredients（JSONB）から材料名だけを取り出す。分量・手順・メモは送らない（プライバシーポリシー §4） */
export function ingredientNames(ingredients: unknown): string[] {
  if (!Array.isArray(ingredients)) return []
  return ingredients
    .map((i) => (i && typeof i === 'object' && 'name' in i ? String((i as { name: unknown }).name).trim() : ''))
    .filter((name) => name.length > 0)
    .slice(0, MAX_INGREDIENTS)
}

/** マイレシピの料理名と材料名から、画像生成のプロンプトを作る */
export function buildNoteImagePrompt(title: string, ingredients: unknown): string {
  const names = ingredientNames(ingredients)
  const dish = names.length > 0 ? `${title} (ingredients: ${names.join(', ')})` : title
  return [
    `A realistic, appetizing photo of a home-cooked dish: ${dish}.`,
    'Served on a simple plate on a table, soft natural light, shot from slightly above.',
    'No text, no letters, no watermark, no people, no hands.',
  ].join(' ')
}
