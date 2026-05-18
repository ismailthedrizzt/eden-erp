'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff, LogIn, RotateCcw } from 'lucide-react'
import { LoginExperience } from '@/components/auth/LoginExperience'
import { PageBanner } from '@/components/ui/PageBanner'

const PREVIEW_STORAGE_KEY = 'eden-login-preview-open'

export default function LoginSettingsPage() {
  const [previewOpen, setPreviewOpen] = useState(true)
  const [previewKey, setPreviewKey] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem(PREVIEW_STORAGE_KEY)
    if (saved) setPreviewOpen(saved === 'true')
  }, [])

  function togglePreview() {
    setPreviewOpen(current => {
      const next = !current
      localStorage.setItem(PREVIEW_STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <div className="relative">
      <PageBanner
        mode="list"
        title="Login Sayfası"
        subtitle="Giriş ekranını sistem ayarları altında geliştirin."
        icon={<LogIn size={24} />}
        onAddClick={togglePreview}
        addButtonText={previewOpen ? 'Kapat' : 'Aç'}
        customButtonIcon={previewOpen ? <EyeOff size={16} /> : <Eye size={16} />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className={`h-2.5 w-2.5 rounded-full ${previewOpen ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          <span>Canlı önizleme {previewOpen ? 'açık' : 'kapalı'}</span>
        </div>

        <button
          type="button"
          onClick={() => setPreviewKey(current => current + 1)}
          disabled={!previewOpen}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <RotateCcw size={15} />
          Sıfırla
        </button>
      </div>

      {previewOpen ? (
        <LoginExperience
          key={previewKey}
          embedded
          redirectOnSuccess={false}
          autoFocus={false}
        />
      ) : (
        <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          <div className="text-center">
            <EyeOff size={34} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Login önizlemesi kapalı.</p>
          </div>
        </div>
      )}
    </div>
  )
}
