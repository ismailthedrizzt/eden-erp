'use client'

/**
 * ImageSlotUploader - ERP Image Upload Component
 * 
 * A professional enterprise-grade image uploader for ERP systems.
 * Supports multiple image slots with navigation, drag & drop, and preview.
 * 
 * @example
 * <ImageSlotUploader
 *   slots={[
 *     { id: 'photo', title: 'Employee Photo', required: true },
 *     { id: 'id_card', title: 'ID Card', required: true },
 *     { id: 'signature', title: 'Signature', required: false },
 *   ]}
 *   images={images}
 *   onChange={handleImagesChange}
 * />
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Image as ImageIcon,
  X,
  ZoomIn,
  Trash2,
  RefreshCw,
  Plus,
  FileImage,
  Search,
  Star,
  History,
  Link2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mediaRegistryService } from '@/lib/modules/document-registry/documentRegistry.service'
import type { MediaAsset, MediaSearchFilters } from '@/lib/modules/document-registry/documentRegistry.types'

export interface ImageSlot {
  id: string
  title: string
  description?: string
  required?: boolean
  acceptedTypes?: string[]
  maxSizeMB?: number
}

export interface SlotImage {
  slotId: string
  mediaAssetId?: string
  file?: File
  previewUrl?: string
  name?: string
  size?: number
  uploadedAt?: Date
}

interface ImageSlotUploaderProps {
  /** Predefined image slots */
  slots: ImageSlot[]
  /** Current images in slots */
  images: SlotImage[]
  /** Callback when images change */
  onChange: (images: SlotImage[]) => void
  /** Allow adding extra slots beyond predefined */
  allowExtraSlots?: boolean
  /** Read-only mode (view only) */
  readOnly?: boolean
  /** Central media registry integration */
  registry?: {
    enabled?: boolean
    entityKind?: 'person' | 'organization' | 'company' | 'vehicle'
    personId?: string
    organizationId?: string
    companyId?: string
    linkedModule?: string
    linkedRecordId?: string
    mediaType?: 'profile_photo' | 'logo' | 'vehicle_photo' | 'gallery'
    onExistingMediaSelected?: (asset: MediaAsset, slot: ImageSlot) => void | Promise<void>
    onSetPrimary?: (image: SlotImage, slot: ImageSlot) => void | Promise<void>
    onViewHistory?: (image: SlotImage, slot: ImageSlot) => void | Promise<void>
    searchFilters?: MediaSearchFilters
  }
  /** Custom className */
  className?: string
}

export function ImageSlotUploader({
  slots,
  images,
  onChange,
  allowExtraSlots = true,
  readOnly = false,
  registry,
  className
}: ImageSlotUploaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState<'upload' | 'select'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<SlotImage | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [extraSlotName, setExtraSlotName] = useState('')
  const [showExtraSlotInput, setShowExtraSlotInput] = useState(false)
  const [existingAssets, setExistingAssets] = useState<MediaAsset[]>([])
  const [existingLoading, setExistingLoading] = useState(false)
  const [existingError, setExistingError] = useState<string | null>(null)
  const [signedPreviewUrls, setSignedPreviewUrls] = useState<Record<string, string>>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Combine predefined slots with extra slots from images
  const allSlots = useMemo(() => {
    const nextSlots: ImageSlot[] = [...slots]
    const extraImages = images.filter(img => !slots.find(s => s.id === img.slotId))
    extraImages.forEach(img => {
      if (!nextSlots.find(s => s.id === img.slotId)) {
        nextSlots.push({
          id: img.slotId,
          title: img.name || 'Other Image',
          required: false
        })
      }
    })
    return nextSlots
  }, [images, slots])

  // Add "Other" slot if allowed
  const displaySlots = useMemo(
    () => allowExtraSlots
      ? [...allSlots, { id: '__extra__', title: 'Other Image', required: false }]
      : allSlots,
    [allSlots, allowExtraSlots]
  )

  const currentSlot = displaySlots[currentIndex]
  const currentImage = images.find(img => img.slotId === currentSlot.id)
  const currentImageUrl = currentImage?.mediaAssetId
    ? signedPreviewUrls[currentImage.mediaAssetId] || currentImage.previewUrl
    : currentImage?.previewUrl
  const hasImage = !!currentImageUrl || !!currentImage?.file
  const registryEnabled = !!registry?.enabled && !readOnly

  useEffect(() => {
    if (!registryEnabled || mode !== 'select') return

    let cancelled = false
    setExistingLoading(true)
    setExistingError(null)

    mediaRegistryService.listMedia({
      entity_kind: registry?.entityKind,
      person_id: registry?.personId,
      organization_id: registry?.organizationId,
      company_id: registry?.companyId,
      media_type: registry?.mediaType,
      ...registry?.searchFilters,
    }).then((items) => {
      if (!cancelled) setExistingAssets(items)
    }).catch((error) => {
      if (!cancelled) setExistingError(error instanceof Error ? error.message : 'Medya alınamadı')
    }).finally(() => {
      if (!cancelled) setExistingLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [mode, registry?.companyId, registry?.entityKind, registry?.mediaType, registry?.organizationId, registry?.personId, registry?.searchFilters, registryEnabled])

  useEffect(() => {
    if (!currentImage?.mediaAssetId || currentImage.previewUrl || signedPreviewUrls[currentImage.mediaAssetId]) return

    let cancelled = false
    mediaRegistryService.getMediaSignedUrl(currentImage.mediaAssetId)
      .then((signedUrl) => {
        if (!cancelled) setSignedPreviewUrls(prev => ({ ...prev, [currentImage.mediaAssetId!]: signedUrl }))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [currentImage?.mediaAssetId, currentImage?.previewUrl, signedPreviewUrls])

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : displaySlots.length - 1))
  }, [displaySlots.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < displaySlots.length - 1 ? prev + 1 : 0))
  }, [displaySlots.length])

  const handleFileSelect = useCallback(async (file: File) => {
    if (!currentSlot || currentSlot.id === '__extra__') return

    // Validate file type
    const acceptedTypes = currentSlot.acceptedTypes || ['image/jpeg', 'image/png', 'image/webp']
    if (!acceptedTypes.includes(file.type)) {
      alert(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`)
      return
    }

    // Validate file size
    const maxSizeMB = currentSlot.maxSizeMB || 5
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`File too large. Maximum size: ${maxSizeMB}MB`)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 100)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)

    // Complete upload simulation
    setTimeout(() => {
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      const newImage: SlotImage = {
        slotId: currentSlot.id,
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        uploadedAt: new Date()
      }

      const updatedImages = images.filter(img => img.slotId !== currentSlot.id)
      onChange([...updatedImages, newImage])
      
      setIsUploading(false)
      setUploadProgress(0)
    }, 500)
  }, [currentSlot, images, onChange])

  const handleSelectExistingAsset = useCallback(async (asset: MediaAsset) => {
    if (!currentSlot || currentSlot.id === '__extra__') return

    let previewUrl: string | undefined
    try {
      previewUrl = await mediaRegistryService.getMediaSignedUrl(asset.id)
    } catch {
      previewUrl = undefined
    }

    const newImage: SlotImage = {
      slotId: currentSlot.id,
      mediaAssetId: asset.id,
      previewUrl,
      name: asset.file_name,
      uploadedAt: asset.created_at ? new Date(asset.created_at) : new Date(),
    }

    if (registry?.linkedModule && registry?.linkedRecordId) {
      await mediaRegistryService.linkMedia(asset.id, registry.linkedModule, registry.linkedRecordId)
    }

    const updatedImages = images.filter(img => img.slotId !== currentSlot.id)
    onChange([...updatedImages, newImage])
    await registry?.onExistingMediaSelected?.(asset, currentSlot)
    setMode('upload')
  }, [currentSlot, images, onChange, registry])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDelete = useCallback(() => {
    if (!currentImage) return
    
    const updatedImages = images.filter(img => img.slotId !== currentSlot.id)
    onChange(updatedImages)
    setShowDeleteConfirm(false)
  }, [currentImage, currentSlot, images, onChange])

  const handleExtraSlotCreate = useCallback(() => {
    if (!extraSlotName.trim()) return
    
    const newSlotId = `extra_${Date.now()}`
    const newImage: SlotImage = {
      slotId: newSlotId,
      name: extraSlotName,
      uploadedAt: new Date()
    }
    
    onChange([...images, newImage])
    setExtraSlotName('')
    setShowExtraSlotInput(false)
    
    // Navigate to the new slot
    const newIndex = displaySlots.findIndex(s => s.id === newSlotId)
    if (newIndex >= 0) {
      setCurrentIndex(newIndex)
    }
  }, [extraSlotName, images, onChange, displaySlots])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious()
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'Escape') setPreviewImage(null)
  }, [handlePrevious, handleNext])

  // A4 aspect ratio style
  const containerStyle = {
    aspectRatio: '1/1.414',
    width: '100%',
    maxWidth: '280px',
    minHeight: '220px'
  }

  return (
    <div 
      className={cn("flex flex-col items-center gap-4", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Main Card */}
      <div 
        className="relative w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={containerStyle}
      >
        {/* Header - Navigation & Title */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            onClick={handlePrevious}
            disabled={displaySlots.length <= 1}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous slot"
          >
            <ChevronLeft size={14} className="text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="flex flex-col items-center min-w-0 px-1">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[70px]">
              {currentSlot.title}
            </span>
            {currentSlot.required && (
              <span className="text-[10px] text-red-500">*</span>
            )}
          </div>
          
          <button
            onClick={handleNext}
            disabled={displaySlots.length <= 1}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next slot"
          >
            <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Center - Image Preview Area */}
        {registryEnabled && !hasImage && currentSlot.id !== '__extra__' && (
          <div className="grid grid-cols-2 gap-1 border-b border-gray-100 bg-white p-1 text-[10px] font-medium dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={cn(
                'rounded px-2 py-1 transition-colors',
                mode === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              Yeni Fotoğraf Yükle
            </button>
            <button
              type="button"
              onClick={() => setMode('select')}
              className={cn(
                'rounded px-2 py-1 transition-colors',
                mode === 'select' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              Mevcut Fotoğraftan Seç
            </button>
          </div>
        )}
        <div
          ref={dropZoneRef}
          onClick={!readOnly && !hasImage && currentSlot.id !== '__extra__' ? () => fileInputRef.current?.click() : undefined}
          onDrop={!readOnly ? handleDrop : undefined}
          onDragOver={!readOnly ? handleDragOver : undefined}
          onDragLeave={!readOnly ? handleDragLeave : undefined}
          className={cn(
            "flex-1 flex flex-col items-center justify-center relative",
            "bg-gray-50 dark:bg-gray-900/50",
            !readOnly && !hasImage && currentSlot.id !== '__extra__' && mode === 'upload' && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900",
            isDragging && "bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400"
          )}
          style={{ height: hasImage ? 'calc(100% - 34px)' : 'calc(100% - 78px)' }}
        >
          {hasImage ? (
            // Uploaded State
            <div className="relative w-full h-full group">
              <img
                src={currentImageUrl || (currentImage?.file ? URL.createObjectURL(currentImage.file) : '')}
                alt={currentSlot.title}
                className="h-full w-full object-cover"
              />
              
              {/* Hover Actions Overlay */}
              {!readOnly && (
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPreviewImage(currentImage || null)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    title="View"
                  >
                    <ZoomIn size={20} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    title="Replace"
                  >
                    <RefreshCw size={20} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => currentImage && registry?.onSetPrimary?.(currentImage, currentSlot)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    title="Set as Primary"
                  >
                    <Star size={20} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => currentImage && registry?.onViewHistory?.(currentImage, currentSlot)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    title="View History"
                  >
                    <History size={20} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 bg-white rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={20} className="text-red-600" />
                  </button>
                </div>
              )}
              
              {/* Read-only View Button */}
              {readOnly && (
                <button
                  onClick={() => setPreviewImage(currentImage || null)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors"
                >
                  <ZoomIn size={32} className="text-white opacity-0 hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          ) : registryEnabled && mode === 'select' && currentSlot.id !== '__extra__' ? (
            <div className="flex h-full flex-col gap-2 p-2">
              <div className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
                <Search size={12} className="text-gray-400" />
                <span className="truncate text-xs text-gray-500">Ana kayıttaki medya varlıkları</span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                {existingLoading ? (
                  <div className="p-3 text-center text-xs text-gray-500">Fotoğraflar yükleniyor...</div>
                ) : existingError ? (
                  <div className="p-3 text-center text-xs text-red-600">{existingError}</div>
                ) : existingAssets.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">Uygun fotoğraf bulunamadı</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-2">
                    {existingAssets.map(asset => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleSelectExistingAsset(asset)}
                        className="group overflow-hidden rounded border border-gray-200 bg-gray-50 text-left hover:border-blue-400 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex aspect-square items-center justify-center bg-gray-100 dark:bg-gray-900">
                          <Link2 size={20} className="text-blue-600" />
                        </div>
                        <div className="p-1">
                          <span className="block truncate text-[10px] font-semibold text-gray-800 dark:text-gray-100">{asset.file_name}</span>
                          <span className="block truncate text-[9px] text-gray-500">{asset.media_type}{asset.is_primary ? ' · Birincil' : ''}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : currentSlot.id === '__extra__' && showExtraSlotInput ? (
            // Extra Slot Name Input
            <div className="flex flex-col items-center gap-3 p-4">
              <input
                type="text"
                value={extraSlotName}
                onChange={(e) => setExtraSlotName(e.target.value)}
                placeholder="Enter image name..."
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExtraSlotInput(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtraSlotCreate}
                  disabled={!extraSlotName.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center gap-2 p-3 text-center">
              {currentSlot.id === '__extra__' ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Add Other
                  </span>
                  <button
                    onClick={() => setShowExtraSlotInput(true)}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Name
                  </button>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <ImageIcon size={16} className="text-gray-400" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Upload
                    </span>
                    {!readOnly && (
                      <span className="text-[10px] text-gray-400">
                        Drop or click
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="absolute inset-x-0 bottom-0 bg-white/90 dark:bg-gray-800/90 p-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom - Upload Button */}
        {!readOnly && !hasImage && currentSlot.id !== '__extra__' && mode === 'upload' && (
          <div className="px-2 py-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button
              onClick={(event) => {
                event.stopPropagation()
                fileInputRef.current?.click()
              }}
              className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
            >
              <Upload size={12} />
              Upload
            </button>
          </div>
        )}

        {/* Slot Indicators */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {displaySlots.map((slot, index) => (
            <div
              key={slot.id}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                index === currentIndex 
                  ? "bg-blue-600" 
                  : images.find(img => img.slotId === slot.id)
                    ? "bg-green-400"
                    : "bg-gray-300 dark:bg-gray-600"
              )}
            />
          ))}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={currentSlot?.acceptedTypes?.join(',') || "image/*"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ''
        }}
      />

      {/* Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={previewImage.mediaAssetId ? signedPreviewUrls[previewImage.mediaAssetId] || previewImage.previewUrl || '' : previewImage.previewUrl || (previewImage.file ? URL.createObjectURL(previewImage.file) : '')}
              alt="Preview"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Image?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone. The image will be permanently removed from this slot.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageSlotUploader
