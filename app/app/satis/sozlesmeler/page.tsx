import { appSatisSozlesmelerPageContract } from '@/contracts/pages/generated/app-satis-sozlesmeler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'
import { appSatisSozlesmelerWizardContract } from '@/contracts/pages/generated/app-satis-sozlesmeler.wizard.contract'
import { appSatisSozlesmelerLifecycleContract } from '@/contracts/pages/generated/app-satis-sozlesmeler.lifecycle.contract'

const appSatisSozlesmelerContractReady = requirePageContract(appSatisSozlesmelerPageContract)

import { FileText } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'

export default function SalesContractsPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="Sözleşme Yönetimi"
        subtitle="Satış süreciyle ilişkili sözleşme kayıtları, belgeleri ve yaşam döngüsü burada yönetilecek."
        icon={<FileText size={24} />}
      />

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
        Sözleşme Yönetimi modülü Satış menüsünün altında konumlandırıldı. CRUD, lifecycle ve belge entegrasyonu ayrı iş paketiyle açılacak.
      </section>
    </div>
  )
}
