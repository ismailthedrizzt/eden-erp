'use client'

import { useState } from 'react'
import EdenModal from '@/components/ui/EdenModal'

export default function StaffAddEditModal({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onClose()
      onSuccess?.()
    }, 1000)
  }

  const tabs = [
    { label: 'Özel', content: <div className="p-4">Özel bilgileri</div> },
    { label: 'İletişim', content: <div className="p-4">İletişim bilgileri</div> },
    { label: 'Eğitim', content: <div className="p-4">Eğitim bilgileri</div> },
    { label: 'Banka', content: <div className="p-4">Banka bilgileri</div> },
    { label: 'İş', content: <div className="p-4">İş bilgileri</div> }
  ]

  return (
    <EdenModal
      open={open}
      onClose={onClose}
      title="Personel Tanımlama"
      heroSection={<div className="p-4">Hero Section</div>}
      tabs={tabs}
      onSave={handleSave}
      loading={loading}
    />
  )
}
