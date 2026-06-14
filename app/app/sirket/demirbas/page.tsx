import { ArrowRight, Package, QrCode, Tag } from 'lucide-react'
import Link from 'next/link'
import { companyFixedAssetsHubPageContract } from '@/contracts/pages/company/company-fixed-assets-hub.page.contract'
import { PageBanner } from '@/components/ui/PageBanner'

const iconByKey = { ArrowRight, Package, QrCode, Tag } as const

type IconKey = keyof typeof iconByKey

function iconFor(key: string, className = 'w-5 h-5 text-gray-400') {
  const Icon = iconByKey[key as IconKey] ?? ArrowRight
  return <Icon className={className} />
}

export default function DemirbasPage() {
  const { dashboard } = companyFixedAssetsHubPageContract

  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title={dashboard.banner.title}
        subtitle={dashboard.banner.subtitle}
        icon={iconFor(dashboard.banner.icon, 'h-6 w-6')}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboard.moduleLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-teal-500 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{link.title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{link.description}</p>
              </div>
              {iconFor(link.icon)}
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-12 dark:border-gray-700 dark:bg-gray-800">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{dashboard.emptyState.title}</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{dashboard.emptyState.message}</p>
        </div>
      </div>
    </div>
  )
}
