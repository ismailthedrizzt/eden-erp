'use client'

/**
 * DocumentSlotUploader - ERP Document Upload Component
 * 
 * A professional enterprise-grade document uploader for ERP systems.
 * Supports multiple document slots with navigation, drag & drop, and preview.
 * 
 * @example
 * <DocumentSlotUploader
 *   slots={[
 *     { id: 'contract', title: 'Employment Contract', required: true },
 *     { id: 'nda', title: 'NDA Agreement', required: true },
 *     { id: 'id_doc', title: 'Identity Document', required: false },
 *   ]}
 *   documents={documents}
 *   onChange={handleDocumentsChange}
 * />
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  FileText,
  File,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  FileType,
  X,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  Plus,
  AlertCircle,
  Sparkles,
  Search,
  Link2
} from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import { documentRegistryService } from '@/lib/modules/document-registry/documentRegistry.service'
import type { DocumentSearchFilters, RegistryDocument } from '@/lib/modules/document-registry/documentRegistry.types'

export interface DocumentSlot {
  id: string
  title: string
  description?: string
  required?: boolean
  acceptedTypes?: string[]
  maxSizeMB?: number
}

export interface SlotDocument {
  slotId: string
  documentId?: string
  documentLinkId?: string
  file?: File
  name: string
  size: number
  type: string
  uploadedAt?: Date
  url?: string
  previewUrl?: string
}

interface DocumentSlotUploaderProps {
  /** Predefined document slots */
  slots: DocumentSlot[]
  /** Current documents in slots */
  documents: SlotDocument[]
  /** Callback when documents change */
  onChange: (documents: SlotDocument[]) => void
  /** Allow adding extra slots beyond predefined */
  allowExtraSlots?: boolean
  /** Read-only mode (view only) */
  readOnly?: boolean
  /** Show a compact AI capability badge without changing the uploader layout */
  aiBadge?: {
    label?: string
    title?: string
  }
  /** Central document registry integration */
  registry?: {
    enabled?: boolean
    companyId?: string
    documentType?: string
    linkedModule?: string
    linkedRecordId?: string
    linkType?: string
    onExistingDocumentSelected?: (document: RegistryDocument, slot: DocumentSlot) => void | Promise<void>
    searchFilters?: DocumentSearchFilters
  }
  /** Custom className */
  className?: string
}

// File type icons and colors
const fileTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  'application/pdf': { 
    icon: FileText, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    label: 'PDF'
  },
  'application/msword': { 
    icon: FileType, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'DOC'
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    icon: FileType, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'DOCX'
  },
  'application/vnd.ms-excel': { 
    icon: FileSpreadsheet, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    label: 'XLS'
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { 
    icon: FileSpreadsheet, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    label: 'XLSX'
  },
  'application/vnd.ms-powerpoint': { 
    icon: Presentation, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    label: 'PPT'
  },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { 
    icon: Presentation, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    label: 'PPTX'
  },
  'application/zip': { 
    icon: FileArchive, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    label: 'ZIP'
  },
  'application/x-zip-compressed': { 
    icon: FileArchive, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    label: 'ZIP'
  },
}

function getFileTypeConfig(type: string) {
  return fileTypeConfig[type] || { 
    icon: File, 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    label: type.split('/').pop()?.toUpperCase() || 'FILE'
  }
}

const DEFAULT_DOCUMENT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
]

function getDocumentUrl(doc?: SlotDocument | null) {
  if (!doc) return ''
  return doc.url || doc.previewUrl || (doc.file ? URL.createObjectURL(doc.file) : '')
}

export function DocumentSlotUploader({
  slots,
  documents,
  onChange,
  allowExtraSlots = true,
  readOnly = false,
  aiBadge,
  registry,
  className
}: DocumentSlotUploaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState<'upload' | 'select'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<SlotDocument | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [extraSlotName, setExtraSlotName] = useState('')
  const [showExtraSlotInput, setShowExtraSlotInput] = useState(false)
  const [existingQuery, setExistingQuery] = useState('')
  const [existingDocuments, setExistingDocuments] = useState<RegistryDocument[]>([])
  const [existingLoading, setExistingLoading] = useState(false)
  const [existingError, setExistingError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Combine predefined slots with extra slots from documents
  const allSlots = useMemo(() => {
    const nextSlots: DocumentSlot[] = [...slots]
    const extraDocs = documents.filter(doc => !slots.find(s => s.id === doc.slotId))
    extraDocs.forEach(doc => {
      if (!nextSlots.find(s => s.id === doc.slotId)) {
        nextSlots.push({
          id: doc.slotId,
          title: doc.name || 'Other Document',
          required: false
        })
      }
    })
    return nextSlots
  }, [documents, slots])

  // Add "Other" slot if allowed
  const displaySlots = useMemo(
    () => allowExtraSlots
      ? [...allSlots, { id: '__extra__', title: 'Other Document', required: false }]
      : allSlots,
    [allSlots, allowExtraSlots]
  )

  const currentSlot = displaySlots[currentIndex]
  const currentDoc = documents.find(doc => doc.slotId === currentSlot.id)
  const hasDocument = !!currentDoc
  const currentAcceptedTypes = currentSlot?.acceptedTypes || DEFAULT_DOCUMENT_ACCEPTED_TYPES
  const registryEnabled = !!registry?.enabled && !readOnly

  useEffect(() => {
    if (!registryEnabled || mode !== 'select') return

    let cancelled = false
    setExistingLoading(true)
    setExistingError(null)

    documentRegistryService.listDocuments({
      company_id: registry?.companyId,
      document_type: registry?.documentType,
      q: existingQuery,
      ...registry?.searchFilters,
    }).then((items) => {
      if (!cancelled) setExistingDocuments(items)
    }).catch((error) => {
      if (!cancelled) setExistingError(error instanceof Error ? error.message : 'Belgeler alınamadı')
    }).finally(() => {
      if (!cancelled) setExistingLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [existingQuery, mode, registry?.companyId, registry?.documentType, registry?.searchFilters, registryEnabled])

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : displaySlots.length - 1))
  }, [displaySlots.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < displaySlots.length - 1 ? prev + 1 : 0))
  }, [displaySlots.length])

  const handleFileSelect = useCallback(async (file: File) => {
    if (!currentSlot || currentSlot.id === '__extra__') return

    // Validate file type
    const acceptedTypes = currentSlot.acceptedTypes || DEFAULT_DOCUMENT_ACCEPTED_TYPES
    if (!acceptedTypes.includes(file.type)) {
      alert(`Invalid file type. Accepted: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP`)
      return
    }

    // Validate file size
    const maxSizeMB = currentSlot.maxSizeMB || 20
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

    // Complete upload simulation
    setTimeout(() => {
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      const newDoc: SlotDocument = {
        slotId: currentSlot.id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      }

      const updatedDocs = documents.filter(doc => doc.slotId !== currentSlot.id)
      onChange([...updatedDocs, newDoc])
      
      setIsUploading(false)
      setUploadProgress(0)
    }, 500)
  }, [currentSlot, documents, onChange])

  const handleSelectExistingDocument = useCallback(async (document: RegistryDocument) => {
    if (!currentSlot || currentSlot.id === '__extra__') return

    const currentFile = document.document_files?.find(file => file.is_current_version) || document.document_files?.[0]
    const newDoc: SlotDocument = {
      slotId: currentSlot.id,
      documentId: document.id,
      name: document.document_title,
      size: currentFile?.file_size || 0,
      type: currentFile?.mime_type || 'application/octet-stream',
      uploadedAt: document.updated_at ? new Date(document.updated_at) : new Date(),
    }

    if (registry?.linkedModule && registry?.linkedRecordId && registry?.linkType) {
      const link = await documentRegistryService.linkDocument({
        document_id: document.id,
        linked_module: registry.linkedModule,
        linked_record_id: registry.linkedRecordId,
        link_type: registry.linkType,
      })
      newDoc.documentLinkId = link.id
    }

    const updatedDocs = documents.filter(doc => doc.slotId !== currentSlot.id)
    onChange([...updatedDocs, newDoc])
    await registry?.onExistingDocumentSelected?.(document, currentSlot)
    setMode('upload')
  }, [currentSlot, documents, onChange, registry])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && currentAcceptedTypes.includes(file.type)) {
      handleFileSelect(file)
    } else {
      alert('Invalid file type. Please upload an accepted document type.')
    }
  }, [currentAcceptedTypes, handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDelete = useCallback(() => {
    if (!currentDoc) return
    
    const updatedDocs = documents.filter(doc => doc.slotId !== currentSlot.id)
    onChange(updatedDocs)
    setShowDeleteConfirm(false)
  }, [currentDoc, currentSlot, documents, onChange])

  const handleExtraSlotCreate = useCallback(() => {
    if (!extraSlotName.trim()) return
    
    const newSlotId = `extra_${Date.now()}`
    const newDoc: SlotDocument = {
      slotId: newSlotId,
      name: extraSlotName,
      size: 0,
      type: 'application/octet-stream',
      uploadedAt: new Date()
    }
    
    onChange([...documents, newDoc])
    setExtraSlotName('')
    setShowExtraSlotInput(false)
    
    // Navigate to the new slot
    const newIndex = displaySlots.findIndex(s => s.id === newSlotId)
    if (newIndex >= 0) {
      setCurrentIndex(newIndex)
    }
  }, [extraSlotName, documents, onChange, displaySlots])

  const handleDownload = useCallback(() => {
    if (!currentDoc?.file && !currentDoc?.url) return
    
    // Create download link
    const url = currentDoc.url || (currentDoc.file ? URL.createObjectURL(currentDoc.file) : '')
    if (url) {
      const link = document.createElement('a')
      link.href = url
      link.download = currentDoc.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      if (!currentDoc.url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [currentDoc])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious()
    if (e.key === 'ArrowRight') handleNext()
    if (e.key === 'Escape') setPreviewDoc(null)
  }, [handlePrevious, handleNext])

  // A4 aspect ratio style
  const containerStyle = {
    aspectRatio: '1/1.414',
    width: '100%',
    maxWidth: '280px',
    minHeight: '220px'
  }

  // Get file type config for current document
  const fileConfig = currentDoc ? getFileTypeConfig(currentDoc.type) : null
  const FileIcon = fileConfig?.icon || FileText

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
        {aiBadge && (
          <div
            title={aiBadge.title || 'AI destekli belge okuma'}
            className="pointer-events-none absolute left-1.5 top-7 z-10 inline-flex h-10 items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50/95 px-3 text-lg font-semibold leading-none text-cyan-700 shadow-sm dark:border-cyan-800 dark:bg-cyan-950/90 dark:text-cyan-300"
          >
            <Sparkles size={20} aria-hidden="true" />
            <span>{aiBadge.label || 'AI'}</span>
          </div>
        )}

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

        {/* Center - Document Display Area */}
        {registryEnabled && !hasDocument && currentSlot.id !== '__extra__' && (
          <div className="grid grid-cols-2 gap-1 border-b border-gray-100 bg-white p-1 text-[10px] font-medium dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={cn(
                'rounded px-2 py-1 transition-colors',
                mode === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              Yeni Belge Yükle
            </button>
            <button
              type="button"
              onClick={() => setMode('select')}
              className={cn(
                'rounded px-2 py-1 transition-colors',
                mode === 'select' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              Mevcut Belgeden Seç
            </button>
          </div>
        )}
        <div
          ref={dropZoneRef}
          onClick={!readOnly && !hasDocument && currentSlot.id !== '__extra__' ? () => fileInputRef.current?.click() : undefined}
          onDrop={!readOnly ? handleDrop : undefined}
          onDragOver={!readOnly ? handleDragOver : undefined}
          onDragLeave={!readOnly ? handleDragLeave : undefined}
          className={cn(
            "flex-1 flex flex-col relative",
            "bg-gray-50 dark:bg-gray-900/50",
            !readOnly && !hasDocument && currentSlot.id !== '__extra__' && mode === 'upload' && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900",
            isDragging && "bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400"
          )}
          style={{ height: hasDocument ? 'calc(100% - 34px)' : 'calc(100% - 78px)' }}
        >
          {hasDocument ? (
            // Uploaded State
            <div className="flex-1 flex flex-col p-3 group">
              {/* File Preview / Thumbnail */}
              <div className="flex-1 flex items-center justify-center">
                {currentDoc?.type === 'application/pdf' && getDocumentUrl(currentDoc) ? (
                  <div className="h-full min-h-36 w-full overflow-hidden rounded border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <iframe
                      src={`${getDocumentUrl(currentDoc)}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                      title={`${currentDoc.name} preview`}
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : currentDoc?.type.includes('image') && getDocumentUrl(currentDoc) ? (
                  <img
                    src={getDocumentUrl(currentDoc)}
                    alt={currentDoc.name}
                    className="h-full min-h-36 w-full rounded border border-gray-200 object-cover shadow-sm dark:border-gray-700"
                  />
                ) : (
                  <div className={cn(
                    "h-28 w-full rounded-lg flex flex-col items-center justify-center gap-1",
                    fileConfig?.bgColor || 'bg-gray-100'
                  )}>
                    <FileIcon size={34} className={cn(
                      fileConfig?.color || 'text-gray-600'
                    )} />
                    <span className={cn(
                      "text-[8px] font-semibold",
                      fileConfig?.color || 'text-gray-600'
                    )}>
                      {fileConfig?.label || 'FILE'}
                    </span>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="mt-1 text-center px-1">
                <p className="text-[10px] font-medium text-gray-900 dark:text-white truncate max-w-[100px]">
                  {currentDoc?.name}
                </p>
                <p className="text-[8px] text-gray-500 dark:text-gray-400">
                  {formatFileSize(currentDoc?.size || 0)}
                </p>
              </div>
              
              {/* Hover Actions Overlay */}
              {!readOnly && (
                <div className="absolute inset-0 bg-white/95 dark:bg-gray-800/95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewDoc(currentDoc || null)}
                      className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title="View"
                    >
                      <Eye size={18} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      title="Replace"
                    >
                      <RefreshCw size={18} className="text-blue-600" />
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                      title="Download"
                    >
                      <Download size={18} className="text-green-600" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Read-only View Button */}
              {readOnly && (
                <button
                  onClick={() => setPreviewDoc(currentDoc || null)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors"
                >
                  <Eye size={28} className="text-white opacity-0 hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          ) : registryEnabled && mode === 'select' && currentSlot.id !== '__extra__' ? (
            <div className="flex h-full flex-col gap-2 p-2">
              <label className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
                <Search size={12} className="text-gray-400" />
                <input
                  value={existingQuery}
                  onChange={(event) => setExistingQuery(event.target.value)}
                  placeholder="Belge ara..."
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-gray-400"
                />
              </label>
              <div className="min-h-0 flex-1 overflow-auto rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                {existingLoading ? (
                  <div className="p-3 text-center text-xs text-gray-500">Belgeler yükleniyor...</div>
                ) : existingError ? (
                  <div className="p-3 text-center text-xs text-red-600">{existingError}</div>
                ) : existingDocuments.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-500">Uygun belge bulunamadı</div>
                ) : (
                  existingDocuments.map(document => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => handleSelectExistingDocument(document)}
                      className="flex w-full items-start gap-2 border-b border-gray-100 p-2 text-left hover:bg-blue-50 dark:border-gray-800 dark:hover:bg-blue-950/30"
                    >
                      <Link2 size={14} className="mt-0.5 shrink-0 text-blue-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-gray-900 dark:text-white">{document.document_title}</span>
                        <span className="block truncate text-[10px] text-gray-500">
                          {document.document_type} · {document.issue_date || 'Tarih yok'} · {document.expiry_date || 'Süre yok'} · {document.status}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : currentSlot.id === '__extra__' && showExtraSlotInput ? (
            // Extra Slot Name Input
            <div className="flex flex-col items-center justify-center gap-3 p-4 h-full">
              <input
                type="text"
                value={extraSlotName}
                onChange={(e) => setExtraSlotName(e.target.value)}
                placeholder="Enter document name..."
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                autoFocus
              />
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setShowExtraSlotInput(false)}
                  className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtraSlotCreate}
                  disabled={!extraSlotName.trim()}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
              {currentSlot.id === '__extra__' ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Add Other
                    </span>
                    <button
                      onClick={() => setShowExtraSlotInput(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Name
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FileText size={16} className="text-gray-400" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Upload
                    </span>
                    {!readOnly && (
                      <span className="text-[10px] text-gray-400">
                        PDF, DOC, XLS...
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="absolute inset-x-0 bottom-0 bg-white/95 dark:bg-gray-800/95 p-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                <span className="font-medium">Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom - Upload Button */}
        {!readOnly && !hasDocument && currentSlot.id !== '__extra__' && mode === 'upload' && (
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
                  : documents.find(doc => doc.slotId === slot.id)
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
        accept={currentAcceptedTypes.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ''
        }}
      />

      {/* Preview Modal */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  fileConfig?.bgColor || 'bg-gray-100'
                )}>
                  <FileIcon size={20} className={fileConfig?.color || 'text-gray-600'} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {previewDoc.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(previewDoc.size)} • {fileConfig?.label || 'Document'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-auto">
              {previewDoc.type === 'application/pdf' ? (
                getDocumentUrl(previewDoc) ? (
                  <iframe
                    src={`${getDocumentUrl(previewDoc)}#toolbar=1&navpanes=0`}
                    title={`${previewDoc.name} preview`}
                    className="h-[60vh] w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700"
                  />
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-8 text-center">
                    <FileText size={64} className="mx-auto text-red-500 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      PDF önizlemesi için dosya bağlantısı bulunamadı.
                    </p>
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      PDF İndir
                    </button>
                  </div>
                )
              ) : previewDoc.type.includes('image') ? (
                <img
                  src={getDocumentUrl(previewDoc)}
                  alt={previewDoc.name}
                  className="max-w-full mx-auto rounded-lg"
                />
              ) : (
                <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-8 text-center">
                  <FileIcon size={64} className={cn(
                    "mx-auto mb-4",
                    fileConfig?.color || 'text-gray-600'
                  )} />
                  <p className="text-gray-600 dark:text-gray-400">
                    Preview not available for this file type.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs text-gray-500">
                Uploaded on {previewDoc.uploadedAt?.toLocaleDateString()}
              </span>
              {!readOnly && (
                <button
                  onClick={() => {
                    setPreviewDoc(null)
                    setShowDeleteConfirm(true)
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Delete Document
                </button>
              )}
            </div>
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
                Delete Document?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone. The document <strong>{currentDoc?.name}</strong> will be permanently removed.
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

export default DocumentSlotUploader
