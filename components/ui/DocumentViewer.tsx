'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Download, Printer, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentViewerProps {
  file: File | File[] | null
  onClose: () => void
}

export function DocumentViewer({ file, onClose }: DocumentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Normalize file to array
  const files = file ? (Array.isArray(file) ? file : [file]) : []
  const currentFile = files[currentIndex] || null

  useEffect(() => {
    if (!currentFile) return

    let url: string | null = null
    if (currentFile.type.startsWith('image/') || currentFile.type === 'application/pdf') {
      url = URL.createObjectURL(currentFile)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [currentFile])

  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(files.length - 1, prev + 1))
  }

  const handlePrint = useCallback(() => {
    if (previewUrl) {
      const printWindow = window.open(previewUrl, '_blank')
      printWindow?.print()
    }
  }, [previewUrl])

  const handleDownload = useCallback(() => {
    if (!currentFile) return
    const url = URL.createObjectURL(currentFile)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [currentFile])

  const renderPreviewContent = () => {
    if (!currentFile) return null

    if (currentFile.type.startsWith('image/') && previewUrl) {
      return (
        <img
          src={previewUrl}
          alt={currentFile.name}
          className="max-w-full max-h-[70vh] object-contain mx-auto"
        />
      )
    } else if (currentFile.type === 'application/pdf' && previewUrl) {
      return (
        <iframe
          src={previewUrl}
          className="w-full h-[70vh] border-0"
          title={currentFile.name}
        />
      )
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
          <FileText size={64} className="mb-4" />
          <p className="text-lg font-medium">{currentFile.name}</p>
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
  }

  if (!currentFile) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-gray-600 dark:text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentFile.name}
              </h3>
              {files.length > 1 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentIndex + 1} / {files.length}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 relative">
          {files.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg transition-all",
                  currentIndex === 0
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:bg-white dark:hover:bg-gray-800"
                )}
              >
                <ChevronLeft size={24} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex === files.length - 1}
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-lg transition-all",
                  currentIndex === files.length - 1
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:bg-white dark:hover:bg-gray-800"
                )}
              >
                <ChevronRight size={24} className="text-gray-700 dark:text-gray-300" />
              </button>
            </>
          )}
          {renderPreviewContent()}
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
