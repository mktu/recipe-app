import { AuthWrapper } from '@/components/providers/auth-wrapper'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthWrapper>{children}</AuthWrapper>
}
