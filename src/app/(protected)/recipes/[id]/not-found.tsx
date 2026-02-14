import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-xl font-semibold">レシピが見つかりません</h2>
      <p className="text-muted-foreground">
        お探しのレシピは存在しないか、削除された可能性があります。
      </p>
      <Button asChild>
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          ホームに戻る
        </Link>
      </Button>
    </div>
  )
}
