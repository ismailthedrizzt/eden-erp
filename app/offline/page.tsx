import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { offlinePageContract } from '@/contracts/pages/system/offline.page.contract'

const OFFLINE_CONTENT = offlinePageContract.offline

export default function OfflinePage() {
  return (
    <main data-contract-route={offlinePageContract.route} className="flex min-h-screen items-center justify-center bg-[#09141e] px-6 text-white">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
          <WifiOff size={30} />
        </div>
        <h1 className="mb-3 text-2xl font-semibold">{OFFLINE_CONTENT.title}</h1>
        <p className="mb-6 text-sm leading-6 text-white/70">{OFFLINE_CONTENT.message}</p>
        <Link
          href={OFFLINE_CONTENT.actionHref}
          className="inline-flex rounded-lg bg-[#216688] px-4 py-2 text-sm font-medium text-white hover:bg-[#174a61]"
        >
          {OFFLINE_CONTENT.actionLabel}
        </Link>
      </section>
    </main>
  )
}
