import { appSatisSonrasiMobilServisAssignmentIdPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-mobil-servis-assignment-id.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiMobilServisAssignmentIdContractReady = requirePageContract(appSatisSonrasiMobilServisAssignmentIdPageContract)
void appSatisSonrasiMobilServisAssignmentIdContractReady

import { MobileServiceFlowPage } from '@/components/modules/product-after-sales/AfterSalesFieldServicePages'

type PageProps = { params: Promise<{ assignment_id: string }> }

export default async function MobileServicePage({ params }: PageProps) {
  const { assignment_id } = await params
  return <MobileServiceFlowPage assignmentId={assignment_id} />
}
