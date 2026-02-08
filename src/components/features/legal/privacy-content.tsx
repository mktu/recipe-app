import { Section } from './legal-page-layout'

export function PrivacyContent() {
  return (
    <>
      <p className="text-sm leading-relaxed text-muted-foreground">
        RecipeHub（以下「本サービス」）は、ユーザーのプライバシーを尊重し、
        個人情報の保護に努めています。本プライバシーポリシーでは、
        本サービスにおける個人情報の取り扱いについて説明します。
      </p>

      <Section title="1. 収集する情報">
        <p>本サービスでは、以下の情報を収集します。</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>LINEアカウント情報（ユーザーID、表示名、プロフィール画像）</li>
          <li>ユーザーが登録したレシピURL</li>
          <li>レシピに関連する食材タグ、メモ等の情報</li>
          <li>サービス利用に関するログ情報</li>
        </ul>
      </Section>

      <Section title="2. 情報の利用目的">
        <p>収集した情報は、以下の目的で利用します。</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>本サービスの提供・運営</li>
          <li>ユーザー認証およびアカウント管理</li>
          <li>レシピの保存・検索機能の提供</li>
          <li>サービスの改善・新機能の開発</li>
          <li>お問い合わせへの対応</li>
        </ul>
      </Section>

      <Section title="3. 情報の第三者提供">
        <p>
          本サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>ユーザーの同意がある場合</li>
          <li>法令に基づく場合</li>
          <li>
            人の生命、身体または財産の保護のために必要がある場合であって、
            ユーザーの同意を得ることが困難である場合
          </li>
        </ul>
      </Section>

      <ExternalServicesSection />
      <DataManagementSection />
    </>
  )
}

function ExternalServicesSection() {
  return (
    <Section title="4. 外部サービスとの連携">
      <p>本サービスは、以下の外部サービスと連携しています。</p>
      <ul className="ml-4 list-disc space-y-1">
        <li>
          <strong>LINE</strong>: ユーザー認証およびメッセージ送受信のために利用
        </li>
        <li>
          <strong>Google（Gemini API）</strong>:
          レシピ情報の解析のために利用（レシピURLの内容を送信）
        </li>
      </ul>
      <p>
        各サービスのプライバシーポリシーについては、各サービス提供元のウェブサイトをご確認ください。
      </p>
    </Section>
  )
}

function DataManagementSection() {
  return (
    <>
      <Section title="5. データの保管と削除">
        <p>
          ユーザーのデータは、サービス提供に必要な期間保管されます。
          アカウントの削除を希望される場合は、お問い合わせください。
          アカウント削除時には、関連するすべてのデータが削除されます。
        </p>
      </Section>

      <Section title="6. セキュリティ">
        <p>
          本サービスは、ユーザーの個人情報を適切に管理し、
          不正アクセス、紛失、破壊、改ざん、漏洩等を防止するため、
          合理的な安全対策を講じています。
        </p>
      </Section>

      <Section title="7. プライバシーポリシーの変更">
        <p>
          本プライバシーポリシーは、必要に応じて変更されることがあります。
          重要な変更がある場合は、本サービス上でお知らせします。
        </p>
      </Section>

      <Section title="8. お問い合わせ">
        <p>
          本プライバシーポリシーに関するお問い合わせは、
          LINE公式アカウントのトーク画面からご連絡ください。
        </p>
      </Section>
    </>
  )
}
