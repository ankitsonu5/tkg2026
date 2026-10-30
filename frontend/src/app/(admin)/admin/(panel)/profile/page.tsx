import type { Metadata } from 'next'

import { ProfileView } from '@/admin/SettingsView'

export const metadata: Metadata = { title: 'Profile' }

export default function ProfilePage() {
  return <ProfileView />
}
