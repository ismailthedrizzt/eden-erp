import { MobileServiceFlowPage } from '@/components/modules/product-after-sales/AfterSalesFieldServicePages'

type PageProps = { params: Promise<{ assignment_id: string }> }

export default async function MobileServicePage({ params }: PageProps) {
  const { assignment_id } = await params
  return <MobileServiceFlowPage assignmentId={assignment_id} />
}
