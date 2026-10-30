import { EditView } from '@/admin/EditView'

export default async function EditDocPage({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params
  return <EditView key={id} slug={collection} id={id} />
}
