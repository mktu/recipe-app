import type { ParseWarning } from '@/lib/recipe/note-markdown/types'

/**
 * 読み取りの警告（#178）。読み飛ばした行は元の行も見せ、編集フォームのどこを直せばよいか分かるようにする。
 */
export function ParseWarnings({ warnings }: { warnings: ParseWarning[] }) {
  if (warnings.length === 0) return null

  return (
    <section aria-labelledby="parse-warnings-heading" className="space-y-1 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
      <h2 id="parse-warnings-heading" className="font-medium">読み取れなかったところがあります</h2>
      <p className="text-muted-foreground">下のフォームで確かめて、必要なら直してから保存してください。</p>
      <ul className="list-disc space-y-1 pl-5">
        {warnings.map((w, i) => (
          <li key={i}>
            {w.message}
            {w.line && <span className="mt-0.5 block break-words font-mono text-xs text-muted-foreground">{w.line}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
