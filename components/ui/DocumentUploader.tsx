'use client'

import { useState, useRef } from 'react'
import { Upload, ChevronLeft, ChevronRight, Trash2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentUploaderProps {
  documents: File[]
  onDocumentsChange: (documents: File[]) => void
  accept?: string
  maxFiles?: number
}

export function DocumentUploader({
  documents,
  onDocumentsChange,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  maxFiles = 10
}: DocumentUploaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      const newDocs = [...documents, ...files].slice(0, maxFiles)
      onDocumentsChange(newDocs)
      // Move to the first newly added document
      setCurrentIndex(documents.length)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDelete = () => {
    if (currentIndex < documents.length) {
      const newDocs = documents.filter((_, i) => i !== currentIndex)
      onDocumentsChange(newDocs)
      // Adjust index if needed
      if (currentIndex >= newDocs.length) {
        setCurrentIndex(Math.max(0, newDocs.length - 1))
      }
      setShowDeleteConfirm(false)
    }
  }

  const goToPrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(documents.length, prev + 1))
  }

  const currentDoc = documents[currentIndex]
  const isLastSlot = currentIndex === documents.length

  // A4 aspect ratio is approximately 1:1.414
  const thumbnailStyle = {
    aspectRatio: '1/1.414'
  }

  return (
    <div className="w-full max-w-xs">
      {/* Thumbnail Display */}
      <div
        className="relative w-full bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        style={thumbnailStyle}
        onClick={() => fileInputRef.current?.click()}
      >
        {isLastSlot ? (
          // Empty slot - Upload prompt
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <Upload size={32} className="mb-2" />
            <span className="text-sm font-medium">Belge Yükle</span>
            <span className="text-xs mt-1 opacity-70">Tıkla veya sürükle</span>
          </div>
        ) : currentDoc ? (
          // Document thumbnail
          <div className="absolute inset-0 flex flex-col">
            {/* Thumbnail preview */}
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 p-2">
              {currentDoc.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(currentDoc)}
                  alt={currentDoc.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                  <FileText size={48} />
                  <span className="text-xs mt-2 uppercase">{currentDoc.name.split('.').pop()}</span>
                </div>
              )}
            </div>
            {/* Document name */}
            <div className="bg-gray-100 dark:bg-gray-700 px-2 py-1.5 truncate">
              <span className="text-xs text-gray-700 dark:text-gray-300 truncate block">
                {currentDoc.name}
              </span>
            </div>
          </div>
        ) : null}

        {/* Page indicator */}
        {documents.length > 0 && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {documents.length + 1}
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className={cn(
            "p-2 rounded-lg transition-colors",
            currentIndex === 0
              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Delete button - only show when viewing a document */}
        {!isLastSlot && documents.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Belgeyi sil"
          >
            <Trash2 size={18} />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <button
          type="button"
          onClick={goToNext}
          disabled={currentIndex >= documents.length}
          className={cn(
            "p-2 rounded-lg transition-colors",
            currentIndex >= documents.length
              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          )}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Belgeyi Sil
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                &ldquo;{currentDoc?.name}&rdquo; belgesini silmek istediğinize emin misiniz?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
