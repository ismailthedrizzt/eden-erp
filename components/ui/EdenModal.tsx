'use client'

import React, { useState } from 'react'
import Modal from './Modal'
import { cn } from '@/lib/utils'

interface EdenModalProps {
  open: boolean
  onClose: () => void
  title: string
  heroSection: React.ReactNode
  tabs: { label: string; content: React.ReactNode; icon?: React.ReactNode }[]
  onSave: () => void
  loading?: boolean
}

export default function EdenModal({ open, onClose, title, heroSection, tabs, onSave, loading = false }: EdenModalProps) {
  const [activeTab, setActiveTab] = useState(0)

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
      >
        Vazgeç
      </button>
      <button
        onClick={onSave}
        disabled={loading}
        className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer} size="2xl">
      {/* Modal'ın iç padding'ini sıfırlayıp kendi düzenimizi kuruyoruz */}
      <div className="-mx-6 -my-5 flex flex-col min-h-[60vh] max-h-[75vh]">
        
        {/* Hero Section (Sabit Kart) */}
        <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-eden-navy-2/30 shrink-0">
          {heroSection}
        </div>

        {/* Tab Menüsü */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar px-2 bg-white dark:bg-eden-navy-2 shrink-0">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={cn(
                'w-40 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 flex items-center gap-2',
                activeTab === idx
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab İçeriği */}
        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-eden-navy-2">
          {tabs[activeTab]?.content}
        </div>
        
      </div>
    </Modal>
  )
}