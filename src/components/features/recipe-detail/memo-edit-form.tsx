'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Check, X } from 'lucide-react'

interface MemoEditFormProps {
  initialValue: string
  onSave: (value: string) => Promise<void>
  onCancel: () => void
}

export function MemoEditForm({ initialValue, onSave, onCancel }: MemoEditFormProps) {
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave(value)
    } finally {
      setIsSaving(false)
    }
  }, [value, onSave])

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="メモを入力..."
        rows={4}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="mr-1 h-4 w-4" />
          キャンセル
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Check className="mr-1 h-4 w-4" />
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}
