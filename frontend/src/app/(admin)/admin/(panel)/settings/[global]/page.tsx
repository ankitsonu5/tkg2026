import { SettingsView } from '@/admin/SettingsView'

export default async function SettingsPage({ params }: { params: Promise<{ global: string }> }) {
  const { global } = await params
  return <SettingsView key={global} slug={global} />
}
