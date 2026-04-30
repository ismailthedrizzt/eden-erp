'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Download, Printer, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentViewerProps {
  file: File | null
  onClose: () => void
}

export function DocumentViewer({ file, onClose }: DocumentViewerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return

    let url: string | null = null
    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
      url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [file])

  if (!file) return null

  const handlePrint = () => {
    if (previewUrl) {
      const printWindow = window.open(previewUrl, '_blank')
      printWindow?.print()
    }
  }

  const handleDownload = () => {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderPreview = useMemo(() => {
    if (file.type.startsWith('image/') && previewUrl) {
      return (
        <img
          src={previewUrl}
          alt={file.name}
          className="max-w-full max-h-[70vh] object-contain mx-auto"
        />
      )
    } else if (file.type === 'application/pdf' && previewUrl) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[70vh] border-0"
          title={file.name}
        />
      )
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <FileText size={64} className="mb-4" />
          <p className="text-lg font-medium">{file.name}</p>
          <p className="text-sm mt-2">Dosya önizleme desteklenmiyor</p>
          <button
            onClick={handleDownload}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            İndir
          </button>
        </div>
      )
    }
  }, [file, previewUrl])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {file.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {renderPreview}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Download size={18} />
            İndir
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Printer size={18} />
            Yazdır
          </button>
        </div>
      </div>
    </div>
  )
}
