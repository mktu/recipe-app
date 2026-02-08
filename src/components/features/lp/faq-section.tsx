import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQ_ITEMS = [
  {
    question: '無料で使えますか？',
    answer: 'はい、RecipeHubは無料でお使いいただけます。',
  },
  {
    question: 'どんなレシピサイトに対応していますか？',
    answer:
      'クックパッド、クラシル、DELISH KITCHENなど、主要なレシピサイトに対応しています。その他のサイトも、レシピ情報が含まれていれば自動解析を試みます。',
  },
  {
    question: 'LINEアカウントは必要ですか？',
    answer:
      'はい、RecipeHubはLINEアプリ内で動作します。LINEアカウントでログインすることで、あなた専用のレシピ図鑑が作成されます。',
  },
  {
    question: '保存したレシピは他の人に見られますか？',
    answer:
      'いいえ、保存したレシピはあなただけが閲覧できます。他のユーザーに公開されることはありません。',
  },
]

export function FAQSection() {
  return (
    <section className="bg-card px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          よくある質問
        </h2>

        <Accordion type="single" collapsible className="mt-8">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
