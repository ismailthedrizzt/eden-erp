import Link from 'next/link'
import { ArrowLeftRight, CreditCard, FileText, Landmark, ReceiptText, Scale, WalletCards } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { accountingHubPageContract } from '@/contracts/pages/accounting/accounting-hub.page.contract'

const iconByName = { ArrowLeftRight, CreditCard, FileText, Landmark, ReceiptText, Scale, WalletCards } as const

type AccountingIconName = keyof typeof iconByName

export default function MuhasebePage() {
  const { banner, moduleLinks } = accountingHubPageContract.dashboard
  const BannerIcon = iconByName[banner.icon]

  return (
    <div>
      <PageBanner mode="list" title={banner.title} subtitle={banner.subtitle} icon={<BannerIcon size={24} />} />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {moduleLinks.map(item => (
          <ModuleLink key={item.href} href={item.href} iconName={item.icon} title={item.title} description={item.description} />
        ))}
      </div>
    </div>
  )
}

function ModuleLink({ href, iconName, title, description }: { href: string; iconName: AccountingIconName; title: string; description: string }) {
  const Icon = iconByName[iconName]
  return (
    <Link href={href} className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-800 dark:hover:bg-blue-950/20">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        <Icon size={22} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>
    </Link>
  )
}
