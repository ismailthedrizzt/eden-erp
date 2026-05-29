import { PortalServiceRequestDetailPage } from '@/components/portal/CustomerPortalWorkspace'

type PageProps = { params: Promise<{ id: string }> }

export default async function CustomerPortalServiceRequestDetailRoute({ params }: PageProps) {
  const { id } = await params
  return <PortalServiceRequestDetailPage requestId={id} />
}

