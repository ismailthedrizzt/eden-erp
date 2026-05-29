import { PortalProductDetailPage } from '@/components/portal/CustomerPortalWorkspace'

type PageProps = { params: Promise<{ id: string }> }

export default async function CustomerPortalProductDetailRoute({ params }: PageProps) {
  const { id } = await params
  return <PortalProductDetailPage productId={id} />
}

