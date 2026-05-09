import Link from 'next/link'
import type { ReactNode } from 'react'
import { CreditCard, FileText, Landmark, WalletCards } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

export default function MuhasebePage() {
  return (
    <div>
      <PageBanner
        mode="list"
        title="Muhasebe"
        subtitle="Finansal ilişkiler, cari kartlar ve ön muhasebe hareketlerini yönetin."
        icon={<CreditCard size={24} />}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ModuleLink
          href="/app/muhasebe/cari-kartlar"
          icon={<WalletCards size={22} />}
          title="Cari Kartlar"
          description="Kişi ve kurumların finansal ilişkilerini, bakiyelerini ve hareketlerini görüntüleyin."
        />
        <ModuleLink
          href="/app/muhasebe/on-muhasebe-hareketleri"
          icon={<FileText size={22} />}
          title="Ön Muhasebe Hareketleri"
          description="Harcama, ödeme, tahsilat ve cari hareketleri sade bir ekrandan yönetin."
        />
        <ModuleLink
          href="/app/muhasebe/banka-kart-hareketleri"
          icon={<Landmark size={22} />}
          title="Banka ve Kart Hareketleri"
          description="Banka ve kredi kartı hareketlerini sağlayıcı bağlantılarından içe aktarın ve eşleştirin."
        />
      </div>
    </div>
  )
}

function ModuleLink({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>
    </Link>
  )
}
