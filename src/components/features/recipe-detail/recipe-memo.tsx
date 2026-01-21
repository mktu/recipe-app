'use client'

import { useState, useCallback } from 'react'
import { MemoDisplay } from './memo-display'
import { MemoEditor } from './memo-editor'

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
    <div>
      {isEditing ? (
        <MemoEditor
          initialValue={memo ?? ''}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <MemoDisplay memo={memo} onClick={() => setIsEditing(true)} />
      )}
    </div>
  )
}
