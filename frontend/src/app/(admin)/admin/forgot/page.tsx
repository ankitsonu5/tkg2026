import type { Metadata } from 'next'

import { ForgotPassword } from '@/admin/ForgotPassword'

export const metadata: Metadata = { title: 'Lost Password' }

export default function ForgotPage() {
  return <ForgotPassword />
}
