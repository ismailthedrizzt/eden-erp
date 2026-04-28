'use client'

import React, { useState } from 'react'
import { User, Phone, GraduationCap, Briefcase, Users, Landmark, FileText } from 'lucide-react'
import EdenModal from '@/components/ui/EdenModal'

export default function StaffAddEditModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [formData, setFormData] = useState({
    fullname: '', idNumber: '', status: 'Görevde', nationality: '', gender: ''
  })

  const handleSave = () => {
    // Burada validasyon yapılabilir
    console.log("Kaydedilecek Veri:", formData)
    alert("Kayıt Başarılı!")
  }

  const HeroContent = (
    <div className="flex flex-col sm:flex-row gap-6 items-center">
      <div className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-gray-800 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        Fotoğraf
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Adı Soyadı *</label>
          <input 
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
            placeholder="Ad Soyad"
            value={formData.fullname}
            onChange={e => setFormData({...formData, fullname: e.target.value})}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">TC/Pasaport No *</label>
          <input 
            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
            placeholder="12345678901"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</label>
          <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md text-sm font-semibold w-fit border border-green-200 dark:border-green-800/50">
            {formData.status}
          </div>
        </div>
      </div>
    </div>
  )

  const tabs = [
    { label: 'Kişisel', icon: <User size={16}/>, content: (
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Uyruğu *</label>
          <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
            <option>T.C.</option>
            <option>Diğer</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cinsiyeti *</label>
          <select className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500">
            <option>Erkek</option>
            <option>Kadın</option>
          </select>
        </div>
      </div>
    )},
    { label: 'İletişim', icon: <Phone size={16}/>, content: (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
           <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cep Telefonu</label><input className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white" /></div>
           <div className="flex flex-col gap-1.5"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-Posta</label><input className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white" /></div>
        </div>
      </div>
    )},
    { label: 'Eğitim', icon: <GraduationCap size={16}/>, content: <div className="text-sm text-gray-500 dark:text-gray-400">Eğitim bilgileri ekranı yapım aşamasında...</div> },
    { label: 'İş', icon: <Briefcase size={16}/>, content: <div className="text-sm text-gray-500 dark:text-gray-400">İş ve SGK ekranı yapım aşamasında...</div> },
    { label: 'Aile', icon: <Users size={16}/>, content: <div className="text-sm text-gray-500 dark:text-gray-400">Aile bilgileri ekranı yapım aşamasında...</div> },
    { label: 'Banka', icon: <Landmark size={16}/>, content: <div className="text-sm text-gray-500 dark:text-gray-400">Banka bilgileri ekranı yapım aşamasında...</div> },
    { label: 'Notlar', icon: <FileText size={16}/>, content: (
      <textarea 
        className="w-full h-32 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
        placeholder="Personel hakkında serbest notlar..."
      />
    )}
  ]

  return (
    <EdenModal 
      open={open} 
      onClose={onClose} 
      title="Personel Tanımlama"
      heroSection={HeroContent}
      tabs={tabs}
      onSave={handleSave}
    />
  )
}