import { offlinePageContract } from '@/contracts/pages/generated/offline.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const offlineContractReady = requirePageContract(offlinePageContract)
void offlineContractReady

import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09141e] px-6 text-white">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
          <WifiOff size={30} />
        </div>
        <h1 className="mb-3 text-2xl font-semibold">Bağlantı yok</h1>
        <p className="mb-6 text-sm leading-6 text-white/70">
          Eden ERP çevrimdışı modda açıldı. Daha önce ziyaret edilen sayfalar ve statik varlıklar önbellekten gelebilir;
          canlı veriler için bağlantı yeniden kurulmalı.
        </p>
        <Link
          href="/app"
          className="inline-flex rounded-lg bg-[#216688] px-4 py-2 text-sm font-medium text-white hover:bg-[#174a61]"
        >
          Ana sayfaya dön
        </Link>
      </section>
    </main>
  )
}
