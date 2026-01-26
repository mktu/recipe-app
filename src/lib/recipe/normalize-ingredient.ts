/**
 * 食材名の正規化
 * JSON-LDやレシピサイトから取得した食材名から、分量・単位・調理用語を除去する
 */

/**
 * 食材名から分量・単位・調理用語を除去して正規化する
 *
 * @example
 * normalizeIngredientName('豚肉細切れ 200g') // → '豚肉細切れ'
 * normalizeIngredientName('なす 2本') // → 'なす'
 * normalizeIngredientName('塩 少々') // → '塩'
 * normalizeIngredientName('鶏もも肉（皮なし） 300g') // → '鶏もも肉皮なし'
 */
export function normalizeIngredientName(raw: string): string {
  return (
    raw
      // 数量・単位パターンの除去（例: 200g, 2本, 大さじ1, 1/2個）
      .replace(
        /[\d０-９\.\/〜～約]+\s*[gGmlMLcmkgKGℓ個本切れ枚丁束袋パック合片かけ房株玉杯尾匹人分]+/g,
        ''
      )
      // 括弧とその中身は保持しつつ括弧記号のみ除去（例: （皮なし）→ 皮なし）
      .replace(/[（()）]/g, '')
      // その他の括弧記号を除去
      .replace(/[【】\[\]「」『』]/g, '')
      // 調理用語・分量表現の除去
      .replace(
        /少々|適量|お好みで|大さじ|小さじ|カップ|ひとつまみ|適宜|ひとかけ|少量|たっぷり|お好み|to taste/gi,
        ''
      )
      // 複数の空白を1つに
      .replace(/\s+/g, ' ')
      // 前後の空白を除去
      .trim()
  )
}
