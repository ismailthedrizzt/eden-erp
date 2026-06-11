import { portalDocumentsPageContract } from '@/contracts/pages/generated/portal-documents.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalDocumentsContractReady = requirePageContract(portalDocumentsPageContract)
void portalDocumentsContractReady

import { PortalDocumentsPage } from '@/components/portal/CustomerPortalWorkspace'

export default function CustomerPortalDocumentsRoute() {
  return <PortalDocumentsPage />
}

