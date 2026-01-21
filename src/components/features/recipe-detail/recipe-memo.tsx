'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { MemoEditForm } from './memo-edit-form'

interface RecipeMemoProps {
  memo: string | null
  onUpdate: (memo: string) => Promise<void>
}

export function RecipeMemo({ memo, onUpdate }: RecipeMemoProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = useCallback(async (value: string) => {
    await onUpdate(value)
    setIsEditing(false)
  }, [onUpdate])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">メモ</CardTitle>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <MemoEditForm
            initialValue={memo ?? ''}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {memo || 'メモはありません'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
