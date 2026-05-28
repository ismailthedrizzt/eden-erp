import Link from 'next/link'
import type { ReactNode } from 'react'
import { CreditCard, FileText, Landmark, ReceiptText, WalletCards } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

export default function MuhasebePage() {
  return (
    <div>
      <PageBanner
        mode="list"
        title="Muhasebe"
        subtitle="Finansal iliskiler, cari kartlar ve cari hareketleri yonetin."
        icon={<CreditCard size={24} />}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ModuleLink
          href="/app/muhasebe/cari-kartlar"
          icon={<WalletCards size={22} />}
          title="Cari Kartlar"
          description="Musteri, tedarikci, ortak, paydas ve muhtelif cari iliskilerini tek karttan yonetin."
        />
        <ModuleLink
          href="/app/muhasebe/cari-hareketler"
          icon={<ReceiptText size={22} />}
          title="Cari Hareketler"
          description="Gider, tahsilat, odeme, belge durumu ve mutabakat hazirligini cari kartlarla birlikte izleyin."
        />
        <ModuleLink
          href="/app/muhasebe/on-muhasebe-hareketleri"
          icon={<FileText size={22} />}
          title="On Muhasebe Hareketleri"
          description="Eski on muhasebe hareketleri ekranini ve kademeli gecis kayitlarini goruntuleyin."
        />
        <ModuleLink
          href="/app/muhasebe/banka-hesaplari-ve-kartlari"
          icon={<Landmark size={22} />}
          title="Banka Hesaplari ve Kartlari"
          description="Banka baglantilarini, hesaplari, kartlari ve entegrasyon ayarlarini yonetin."
        />
        <ModuleLink
          href="/app/muhasebe/hesap-ve-kart-hareketleri"
          icon={<CreditCard size={22} />}
          title="Hesap ve Kart Hareketleri"
          description="Hesap ve kart hareketlerini goruntuleyin, filtreleyin ve on muhasebe kayitlariyla eslestirin."
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
