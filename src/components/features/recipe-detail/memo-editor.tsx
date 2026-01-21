'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

interface MemoEditorProps {
  initialValue: string
  onSave: (value: string) => Promise<void>
  onCancel: () => void
}

export function MemoEditor({ initialValue, onSave, onCancel }: MemoEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(value.length, value.length)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave(value)
    } finally {
      setIsSaving(false)
    }
  }, [value, onSave])

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="メモを入力..."
        rows={4}
        className="w-full resize-none rounded-lg bg-muted/50 p-3 text-sm outline-none focus:bg-muted"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
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
