import { EditView } from '@/admin/EditView'

export default async function NewDocPage({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params
  return <EditView slug={collection} id={null} />
}
