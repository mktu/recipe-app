import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NoteStepsProps {
  steps: string[]
}

/**
 * 調理手順。HTML に変換せず React のテキストとして描画するので、サニタイズは要らない。
 * 1手順の中の改行は `whitespace-pre-wrap` でそのまま見せる。
 */
export function NoteSteps({ steps }: NoteStepsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">作り方</CardTitle>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">手順が登録されていません。</p>
        ) : (
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  {index + 1}
                </span>
                <p className="whitespace-pre-wrap pt-0.5 text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
