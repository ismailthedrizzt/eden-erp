import { FilePlus2 } from 'lucide-react'
import { ContractForm } from '@/components/contracts/ContractForm'
import { PageBanner } from '@/components/ui/PageBanner'

export default function NewContractPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="form"
        title="Yeni S?zle?me"
        subtitle="Ekle aksiyonu yaln?zca taslak s?zle?me kart? olu?turur. Aktivasyon resmi i?lemle yap?l?r."
        icon={<FilePlus2 size={24} />}
      />
      <ContractForm />
    </div>
  )
}
