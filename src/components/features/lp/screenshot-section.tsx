import Image from 'next/image'

export function ScreenshotSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
          シンプルで使いやすい
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          あなた専用のレシピ図鑑
        </p>

        {/* mobile: scroll snap / desktop: side-by-side */}
        <div className="mt-12 -mx-4 flex snap-x snap-mandatory overflow-x-auto sm:mx-0 sm:justify-center sm:overflow-visible">
          <div className="flex w-full shrink-0 snap-center justify-center px-4 sm:w-auto sm:px-0">
            <Image
              src="/line-screenshot.webp"
              alt="LINEトーク画面"
              width={1024}
              height={1916}
              className="h-96 w-auto drop-shadow-xl"
            />
          </div>
          <div className="flex w-full shrink-0 snap-center justify-center px-4 sm:w-auto sm:px-0 sm:ml-8">
            <Image
              src="/frame-screenshot.webp"
              alt="解析結果確認画面"
              width={990}
              height={1916}
              className="h-96 w-auto drop-shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
