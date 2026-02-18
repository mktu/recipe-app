import Image from 'next/image'
import Link from 'next/link'
import {
  MessageCircleIcon,
  ChevronDownIcon,
  CheckIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeroSectionProps {
  lineFriendUrl: string
}

export function HeroSection({ lineFriendUrl }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-24 sm:px-6 lg:px-8">
      <HeroDecorations />

      <div className="relative mx-auto max-w-5xl">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <HeroContent lineFriendUrl={lineFriendUrl} />
          <PhoneMockup />
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDownIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    </section>
  )
}

function HeroDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="absolute -top-4 right-4 h-24 w-24 text-red-400/20 sm:h-32 sm:w-32"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <circle cx="50" cy="55" r="40" />
        <path d="M50 15 Q45 5 40 15 Q35 5 30 15 L35 25 Q42 20 50 25 Q58 20 65 25 L70 15 Q65 5 60 15 Q55 5 50 15" />
      </svg>
      <svg
        className="absolute top-1/3 -left-8 h-28 w-28 rotate-45 text-orange-400/20 sm:h-36 sm:w-36"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <path d="M50 10 L70 80 Q50 95 30 80 Z" />
        <path d="M45 5 Q40 -5 35 5 L42 15 Z" />
        <path d="M55 5 Q60 -5 65 5 L58 15 Z" />
      </svg>
      <svg
        className="absolute -bottom-8 right-1/4 h-24 w-24 text-amber-300/20 sm:h-32 sm:w-32"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <ellipse cx="50" cy="60" rx="35" ry="30" />
        <path d="M50 30 Q45 15 50 5 Q55 15 50 30" />
      </svg>
    </div>
  )
}

function HeroContent({ lineFriendUrl }: { lineFriendUrl: string }) {
  return (
    <div className="text-center lg:text-left">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
        お気に入りレシピを
        <br />
        <span className="text-primary">食材で検索</span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground lg:mx-0">
        SNSやWebで見つけたレシピをURLで保存。
        <br />
        自動でタグ付けして、冷蔵庫の中身から
        <br className="hidden sm:inline" />
        あなたのレシピを瞬時に検索。
      </p>
      <div className="mt-8">
        <Button
          asChild
          size="lg"
          className="gap-2 bg-[#06C755] text-base text-white hover:bg-[#05b04c]"
        >
          <Link href={lineFriendUrl}>
            <MessageCircleIcon className="h-5 w-5" />
            LINEで始める
          </Link>
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground lg:justify-start">
        <span className="flex items-center gap-1">
          <CheckIcon className="h-4 w-4 text-accent" />
          完全無料
        </span>
        <span className="flex items-center gap-1">
          <CheckIcon className="h-4 w-4 text-accent" />
          登録かんたん
        </span>
        <span className="flex items-center gap-1">
          <CheckIcon className="h-4 w-4 text-accent" />
          広告なし
        </span>
      </div>
    </div>
  )
}

function PhoneMockup() {
  return (
    <div className="flex justify-center lg:justify-end">
      <Image
        src="/hero-mockup.png"
        alt="RecipeHubアプリのスクリーンショット"
        width={280}
        height={560}
        className="h-auto w-[200px] sm:w-[280px]"
        priority
      />
    </div>
  )
}
