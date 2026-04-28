'use client'

import { useTeskilat } from '@/hooks/useTeskilat'
import { Building2 } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

export default function TeskilatPage() {
  const { data: teskilat, loading } = useTeskilat()

  return (
    <div className="space-y-6">
      <PageBanner
        title="Teşkilat Şeması"
        icon={<Building2 size={24} />}
        onAddClick={undefined}
      />

      {/* Teşkilat şeması burada gösterilecek */}
      <div className="card">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Building2 size={48} className="mx-auto mb-4 opacity-50" />
          <p>Teşkilat şeması yakında eklenecek</p>
        </div>
      </div>
    </div>
  )
}