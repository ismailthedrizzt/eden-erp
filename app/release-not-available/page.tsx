import { releaseNotAvailablePageContract } from '@/contracts/pages/generated/release-not-available.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const releaseNotAvailableContractReady = requirePageContract(releaseNotAvailablePageContract)
void releaseNotAvailableContractReady

import { RouteNotAvailableState } from '@/components/release/RouteNotAvailableState'

export default async function ReleaseNotAvailablePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reason?: string }>
}) {
  const params = await searchParams
  return <RouteNotAvailableState route={params.from} reason={params.reason} />
}
