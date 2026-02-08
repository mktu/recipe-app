import { LinkIcon, SearchIcon, TagsIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function FeaturesSection() {
  return (
    <section className="bg-card px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          3ステップで簡単
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          面倒な入力は一切不要
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          <FeatureStep
            step={1}
            icon={<LinkIcon className="h-8 w-8 text-primary" />}
            title="URLを送るだけ"
            description="気になるレシピを見つけたら、LINEにURLを送信するだけ"
          />
          <FeatureStep
            step={2}
            icon={<TagsIcon className="h-8 w-8 text-primary" />}
            title="AIが自動タグ付け"
            description="レシピの食材を自動で抽出してタグ付け。手間なく整理できます"
          />
          <FeatureStep
            step={3}
            icon={<SearchIcon className="h-8 w-8 text-primary" />}
            title="食材で検索"
            description="「今日は鶏肉があるな」食材から自分のレシピを瞬時に検索"
          />
        </div>
      </div>
    </section>
  )
}

function FeatureStep({
  step,
  icon,
  title,
  description,
}: {
  step: number
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <div className="mt-2 text-sm font-medium text-primary">Step {step}</div>
      <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
