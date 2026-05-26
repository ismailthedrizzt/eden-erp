'use client'

import { HelpCircle, PlayCircle, X } from 'lucide-react'
import type { ActionGuideResult } from '@/lib/ai/actionGuide'
import { ActionGuideResultCard } from './ActionGuideResultCard'

interface ActionGuidePanelProps {
  open: boolean
  result: ActionGuideResult | null
  loading?: boolean
  error?: string | null
  currentPageTourKey?: string | null
  onClose: () => void
  onStartSystemTour?: () => void
}

export function ActionGuidePanel({
  open,
  result,
  loading,
  error,
  currentPageTourKey,
  onClose,
  onStartSystemTour,
}: ActionGuidePanelProps) {
  if (!open) return null

  const startPageTour = () => {
    window.dispatchEvent(new CustomEvent('eden:start-page-tour', { detail: { tourKey: currentPageTourKey || undefined } }))
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,420px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div>
          <div className="text-sm font-semibold text-gray-950 dark:text-white">AI İşlem Rehberi</div>
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Yapmak istediğiniz işi doğru sayfa ve sihirbaza çevirir.</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-900 dark:hover:text-gray-200" aria-label="Rehberi kapat">
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[68vh] overflow-y-auto p-4">
        {loading && <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">Yol haritası hazırlanıyor...</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">{error}</div>}
        {!loading && !error && result && <ActionGuideResultCard result={result} onActionExecuted={onClose} />}
        {!loading && !error && !result && (
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              Örnek: “Şube açmak istiyorum”, “Şirket adresini değiştireceğim”, “Temsilciye banka yetkisi vereceğim”.
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={startPageTour} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
                <HelpCircle size={15} />
                Bu sayfanın turu
              </button>
              <button type="button" onClick={onStartSystemTour} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
                <PlayCircle size={15} />
                Genel tur
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
