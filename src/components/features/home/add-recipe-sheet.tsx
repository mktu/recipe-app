'use client'

import Link from 'next/link'
import { Link2, NotebookPen, type LucideIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface AddRecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** レシピの追加方法を選ぶ。URL からのブックマークか、手で書くノートか（Issue #175） */
export function AddRecipeSheet({ open, onOpenChange }: AddRecipeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="safe-bottom">
        <SheetHeader>
          <SheetTitle>レシピを追加</SheetTitle>
        </SheetHeader>
        <nav className="space-y-2 px-4 pb-6">
          <AddOption href="/recipes/add" icon={Link2} label="URL から追加" description="レシピサイトや SNS のページを保存する" />
          <AddOption href="/notes/new" icon={NotebookPen} label="ノートを書く" description="自分のレシピを材料と手順から書く" />
        </nav>
      </SheetContent>
    </Sheet>
  )
}

interface AddOptionProps {
  href: string
  icon: LucideIcon
  label: string
  description: string
}

function AddOption({ href, icon: Icon, label, description }: AddOptionProps) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted">
      <Icon aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
