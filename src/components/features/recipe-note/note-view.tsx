'use client'

import { Clock, Pencil, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecipeIngredients } from '@/components/features/recipe-detail'
import { FALLBACK_IMAGE_PATH } from '@/lib/recipe/placeholder-images'
import type { RecipeNoteDetail } from '@/types/recipe'
import { NoteSteps } from './note-steps'

interface NoteViewProps {
  note: RecipeNoteDetail
  onEdit: () => void
}

export function NoteView({ note, onEdit }: NoteViewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={note.imageUrl ?? FALLBACK_IMAGE_PATH} alt="" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-xl font-bold">{note.title}</h1>
        <NoteMeta servings={note.servings} cookingTimeMinutes={note.cookingTimeMinutes} />
      </div>

      <RecipeIngredients ingredients={note.ingredients} emptyMessage="材料が登録されていません。" />
      <NoteSteps steps={note.steps} />

      {note.memo && (
        <section className="rounded-xl bg-muted/50 p-4">
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">メモ</h2>
          <p className="whitespace-pre-wrap text-sm">{note.memo}</p>
        </section>
      )}

      <Button variant="outline" className="w-full" onClick={onEdit}>
        <Pencil className="mr-2 h-4 w-4" />
        ノートを編集
      </Button>
    </div>
  )
}

function NoteMeta({ servings, cookingTimeMinutes }: { servings: string | null; cookingTimeMinutes: number | null }) {
  if (!servings && cookingTimeMinutes === null) return null
  return (
    <div className="flex gap-4 text-sm text-muted-foreground">
      {servings && (
        <span className="flex items-center gap-1"><Users className="h-4 w-4" aria-hidden />{servings}</span>
      )}
      {cookingTimeMinutes !== null && (
        <span className="flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{cookingTimeMinutes}分</span>
      )}
    </div>
  )
}
