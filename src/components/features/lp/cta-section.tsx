import Link from 'next/link'
import { MessageCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CTASectionProps {
  lineFriendUrl: string
}

export function CTASection({ lineFriendUrl }: CTASectionProps) {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          今すぐ始めよう
        </h2>
        <p className="mt-4 text-muted-foreground">
          お気に入りレシピを集めて、献立選びをもっとラクに
        </p>
        <div className="mt-8">
          <Button
            asChild
            size="lg"
            className="gap-2 bg-[#06C755] text-base text-white hover:bg-[#05b04c]"
          >
            <Link href={lineFriendUrl}>
              <MessageCircleIcon className="h-5 w-5" />
              LINEで友だち追加
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export function LPFooter() {
  return (
    <footer className="border-t bg-card px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <div className="flex justify-center gap-4 text-sm">
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground"
          >
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground"
          >
            プライバシーポリシー
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} RecipeHub
        </p>
      </div>
    </footer>
  )
}
