import { RouteNotAvailableState } from '@/components/release/RouteNotAvailableState'

export default async function ReleaseNotAvailablePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reason?: string }>
}) {
  const params = await searchParams
  return <RouteNotAvailableState route={params.from} reason={params.reason} />
}
