import { AlertTriangle, CalendarClock, ClipboardCheck, Headphones, Navigation, PackageCheck, Wrench } from 'lucide-react'
import Link from 'next/link'
import { afterSalesHubPageContract } from '@/contracts/pages/after-sales/after-sales-hub.page.contract'
import { PageBanner } from '@/components/ui/PageBanner'

const iconByKey = { AlertTriangle, CalendarClock, ClipboardCheck, Headphones, Navigation, PackageCheck, Wrench } as const

type IconKey = keyof typeof iconByKey

function iconFor(key: string, className = 'h-5 w-5') {
  const Icon = iconByKey[key as IconKey] ?? Headphones
  return <Icon className={className} />
}

export default function AfterSalesPage() {
  const { dashboard } = afterSalesHubPageContract

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title={dashboard.banner.title}
        subtitle={dashboard.banner.subtitle}
        icon={iconFor(dashboard.banner.icon, 'h-6 w-6')}
      />
      <div className="grid gap-4 lg:grid-cols-4">
        {dashboard.moduleLinks.map(link => (
          <Link key={link.href} href={link.href} className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-cyan-500 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start gap-3">
              <span className="rounded-md bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200">{iconFor(link.icon)}</span>
              <span>
                <span className="block font-semibold text-gray-900 dark:text-white">{link.title}</span>
                <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">{link.description}</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
        {dashboard.infoPanel}
      </div>
    </div>
  )
}
