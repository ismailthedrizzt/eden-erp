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

import { useState, useRef, useCallback, useMemo, useEffect, type ReactNode } from 'react'
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
  History
} from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'

export interface DocumentSlot {
  id: string
  title: string
  description?: string
  required?: boolean
  acceptedTypes?: string[]
  maxSizeMB?: number
  storageField?: string
}

export interface SlotDocument {
  slotId: string
  documentId?: string
  documentLinkId?: string
  storagePath?: string
  file?: File
  name: string
  size: number
  type: string
  uploadedAt?: Date | string
  updatedAt?: Date | string
  deletedAt?: Date | string
  replacedAt?: Date | string
  status?: 'active' | 'archived' | 'deleted' | string
  version?: number
  slotTitle?: string
  isDeleted?: boolean
  url?: string
  previewUrl?: string
  thumbnailUrl?: string
  thumbnailPath?: string
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
  /** Form interaction mode */
  mode?: 'insert' | 'view' | 'update'
  /** Initial tab to show when the uploader mounts */
  defaultTab?: 'upload' | 'documents'
  /** Show a compact AI capability badge without changing the uploader layout */
  aiBadge?: {
    label?: string
    title?: string
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

function getDocumentExtension(doc?: SlotDocument | null) {
  const source = `${doc?.name || ''} ${doc?.url || ''} ${doc?.previewUrl || ''}`.split('?')[0].toLowerCase()
  const match = source.match(/\.([a-z0-9]+)(?:$|[#\s])/)
  return match?.[1] || ''
}

function getDocumentDataUrlMime(doc?: SlotDocument | null) {
  const source = doc?.url || doc?.previewUrl || doc?.thumbnailUrl || ''
  const match = source.match(/^data:([^;,]+)[;,]/i)
  return match?.[1]?.toLowerCase() || ''
}

function getEffectiveDocumentType(doc?: SlotDocument | null) {
  const type = doc?.type || ''
  if (type && type !== 'application/octet-stream') return type

  const dataUrlMime = getDocumentDataUrlMime(doc)
  if (dataUrlMime) return dataUrlMime

  const extension = getDocumentExtension(doc)
  if (extension === 'pdf') return 'application/pdf'
  if (['jpg', 'jpeg'].includes(extension)) return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'gif') return 'image/gif'
  if (extension === 'doc') return 'application/msword'
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (extension === 'xls') return 'application/vnd.ms-excel'
  if (extension === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (extension === 'ppt') return 'application/vnd.ms-powerpoint'
  if (extension === 'pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (extension === 'zip') return 'application/zip'

  return type || 'application/octet-stream'
}

function isPdfDocument(doc?: SlotDocument | null) {
  return getEffectiveDocumentType(doc) === 'application/pdf'
}

function isImageDocument(doc?: SlotDocument | null) {
  return getEffectiveDocumentType(doc).startsWith('image/')
}

function isTextDocument(doc?: SlotDocument | null) {
  const type = getEffectiveDocumentType(doc)
  const extension = getDocumentExtension(doc)
  return type.startsWith('text/') ||
    ['application/json', 'application/xml', 'application/csv'].includes(type) ||
    ['txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'log'].includes(extension)
}

function isDocxDocument(doc?: SlotDocument | null) {
  return getEffectiveDocumentType(doc) === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    getDocumentExtension(doc) === 'docx'
}

function canInlinePreview(doc?: SlotDocument | null, url?: string) {
  return !!url && (isPdfDocument(doc) || isTextDocument(doc) || isDocxDocument(doc) || getEffectiveDocumentType(doc) === 'application/octet-stream')
}

const DEFAULT_DOCUMENT_ACCEPTED_TYPES = [
  'image/*',
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

function acceptsFileType(acceptedTypes: string[], fileType: string) {
  return acceptedTypes.some(type => type === fileType || (type.endsWith('/*') && fileType.startsWith(type.slice(0, -1))))
}

function acceptsCameraCapture(acceptedTypes: string[]) {
  return acceptedTypes.some(type => type === 'image/*' || type.startsWith('image/'))
}

function shouldKeepLocalFileForSlot(slot?: DocumentSlot | null) {
  return !!slot && ('hydratesFields' in slot || 'generatedFrom' in slot)
}

function getDocumentSignedKey(doc?: SlotDocument | null) {
  if (!doc) return ''
  if (doc.storagePath) return doc.storagePath
  const documentId = doc.documentId || ''
  if (!documentId || documentId.startsWith('pending:') || /^https?:\/\//i.test(documentId) || documentId.startsWith('blob:') || documentId.startsWith('data:')) return ''
  return documentId.includes('/') ? documentId : ''
}

function getDocumentThumbnailSignedKey(doc?: SlotDocument | null) {
  return doc?.thumbnailPath || ''
}

function getDocumentUrl(doc?: SlotDocument | null) {
  if (!doc) return ''
  const url = firstLocalDocumentUrl(doc.url, doc.previewUrl)
  return url || (doc.file ? URL.createObjectURL(doc.file) : '')
}

function firstLocalDocumentUrl(...values: Array<string | undefined>) {
  return values.find(value => value && !isExternalStorageUrl(value)) || ''
}

function isExternalStorageUrl(value?: string) {
  if (!value || !/^https?:\/\//i.test(value)) return false
  try {
    const url = new URL(value)
    const blockedStorageHost = `${String.fromCharCode(115, 117, 112, 97, 98, 97, 115, 101)}.${String.fromCharCode(99, 111)}`
    return url.hostname.endsWith(blockedStorageHost) && url.pathname.includes('/storage/')
  } catch {
    return false
  }
}

function isFallbackDocumentThumbnailUrl(value?: string) {
  return !!value && value.startsWith('data:image/svg+xml')
}

function getDocumentThumbnailUrl(doc?: SlotDocument | null, thumbnailSignedUrl?: string, signedUrl?: string) {
  if (!doc) return ''
  if (thumbnailSignedUrl) return thumbnailSignedUrl
  if (doc.thumbnailUrl && !isExternalStorageUrl(doc.thumbnailUrl)) return doc.thumbnailUrl
  if (isImageDocument(doc)) return firstLocalDocumentUrl(doc.previewUrl, signedUrl, doc.url) || (doc.file ? URL.createObjectURL(doc.file) : '')
  const config = getFileTypeConfig(getEffectiveDocumentType(doc))
  return generateFallbackDocumentThumbnail(config.label || 'FILE', doc.name || 'Belge')
}

function isLikelyImageThumbnailUrl(value?: string) {
  if (!value) return false
  if (value.startsWith('data:image/')) return true
  const clean = value.split('?')[0].split('#')[0].toLowerCase()
  return /\.(png|jpe?g|webp|gif|svg)$/.test(clean)
}

function canRenderDocumentThumbnail(doc?: SlotDocument | null, thumbnailUrl?: string) {
  if (!doc || !thumbnailUrl) return false
  if (isFallbackDocumentThumbnailUrl(thumbnailUrl)) return true
  if (isImageDocument(doc)) return true
  if (doc.thumbnailPath && isLikelyImageThumbnailUrl(doc.thumbnailPath)) return true
  return !!doc.thumbnailUrl && isLikelyImageThumbnailUrl(thumbnailUrl)
}

type DocumentThumbnailImageProps = {
  doc?: SlotDocument | null
  thumbnailUrl?: string
  alt: string
  className: string
  fallback: ReactNode
}

function DocumentThumbnailImage({ doc, thumbnailUrl, alt, className, fallback }: DocumentThumbnailImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed || !canRenderDocumentThumbnail(doc, thumbnailUrl)) return <>{fallback}</>
  return <img src={thumbnailUrl} alt={alt} className={className} onError={() => setFailed(true)} />
}

function getDocumentTimestamp(doc?: SlotDocument | null) {
  const value = doc?.updatedAt || doc?.uploadedAt || doc?.replacedAt || doc?.deletedAt
  if (!value) return 0
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function isActiveDocument(doc?: SlotDocument | null) {
  if (!doc) return false
  return !doc.isDeleted && doc.status !== 'deleted' && doc.status !== 'archived'
}

function getDocumentIdentity(doc: SlotDocument) {
  return doc.documentLinkId || doc.documentId || doc.storagePath || `${doc.slotId}:${doc.name}:${doc.size}:${getDocumentTimestamp(doc)}`
}

function getLatestActiveDocument(documents: SlotDocument[], slotId: string) {
  return documents
    .filter(doc => doc.slotId === slotId && isActiveDocument(doc))
    .sort((a, b) => (b.version || 0) - (a.version || 0) || getDocumentTimestamp(b) - getDocumentTimestamp(a))[0]
}

function getDocumentStatusLabel(doc: SlotDocument) {
  if (doc.isDeleted || doc.status === 'deleted') return 'Silindi'
  if (doc.status === 'archived') return 'Eski sürüm'
  return 'Aktif'
}

function formatDocumentDate(value?: Date | string) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('tr-TR')
}

async function uploadDocumentFile(file: File, slotId: string) {
  const body = new FormData()
  body.append('file', file)
  body.append('slotId', slotId)
  body.append('document_slot_key', slotId)
  body.append('document_type', slotId)
  body.append('document_category', 'slot_document')

  const response = await fetch('/api/uploads/documents', {
    method: 'POST',
    credentials: 'same-origin',
    body,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || 'Belge yüklenemedi')
  }

  return {
    storagePath: String(result.storagePath || ''),
    url: String(result.url || ''),
    thumbnailPath: String(result.thumbnailPath || ''),
    thumbnailUrl: String(result.thumbnailUrl || ''),
    name: String(result.name || file.name),
    size: Number(result.size || file.size),
    type: String(result.type || file.type || 'application/octet-stream'),
  }
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function generateFallbackDocumentThumbnail(label: string, title = 'Belge') {
  const safeLabel = escapeSvgText(label || 'FILE')
  const safeTitle = escapeSvgText((title || 'Belge').slice(0, 28))
  const accent = label === 'PDF' ? '#dc2626' : label === 'TXT' ? '#2563eb' : '#4b5563'
  const lines = Array.from({ length: 9 }, (_, index) => {
    const width = 244 - (index % 3) * 26
    const y = 285 + index * 18
    return `<rect x="58" y="${y}" width="${width}" height="7" rx="3.5" fill="#d1d5db"/>`
  }).join('')
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="360" height="510" viewBox="0 0 360 510">
      <rect width="360" height="510" fill="#ffffff"/>
      <rect x="18" y="18" width="324" height="474" rx="8" fill="none" stroke="#e5e7eb" stroke-width="2"/>
      <rect x="52" y="72" width="256" height="118" rx="10" fill="${accent}"/>
      <text x="180" y="148" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${safeLabel}</text>
      <text x="180" y="238" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#111827">${safeTitle}</text>
      ${lines}
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function DocumentSlotUploader({
  slots,
  documents,
  onChange,
  allowExtraSlots = true,
  readOnly = false,
  mode,
  defaultTab = 'upload',
  aiBadge,
  className
}: DocumentSlotUploaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<SlotDocument | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<SlotDocument | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'documents'>(defaultTab)
  const [replaceSlotId, setReplaceSlotId] = useState<string | null>(null)
  const [expandedHistorySlotIds, setExpandedHistorySlotIds] = useState<string[]>([])
  const [extraSlotName, setExtraSlotName] = useState('')
  const [showExtraSlotInput, setShowExtraSlotInput] = useState(false)
  const [signedPreviewUrls, setSignedPreviewUrls] = useState<Record<string, string>>({})
  const [previewText, setPreviewText] = useState<{ loading: boolean; content: string; error: string }>({ loading: false, content: '', error: '' })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceFileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const canMutate = !readOnly && mode !== 'view'

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
    () => allowExtraSlots && canMutate
      ? [...allSlots, { id: '__extra__', title: 'Other Document', required: false }]
      : allSlots,
    [allSlots, allowExtraSlots, canMutate]
  )

  const currentSlot = displaySlots[currentIndex]
  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => getDocumentTimestamp(b) - getDocumentTimestamp(a)),
    [documents]
  )
  const currentDoc = currentSlot ? getLatestActiveDocument(documents, currentSlot.id) : undefined
  const currentDocSignedKey = getDocumentSignedKey(currentDoc)
  const currentDocThumbnailSignedKey = getDocumentThumbnailSignedKey(currentDoc)
  const currentDocUrl = getDocumentUrl(currentDoc) || (currentDocSignedKey ? signedPreviewUrls[currentDocSignedKey] : '')
  const currentDocThumbnailUrl = getDocumentThumbnailUrl(
    currentDoc,
    currentDocThumbnailSignedKey ? signedPreviewUrls[currentDocThumbnailSignedKey] : undefined,
    currentDocSignedKey ? signedPreviewUrls[currentDocSignedKey] : undefined
  )
  const hasDocument = !!currentDoc
  const currentAcceptedTypes = currentSlot?.acceptedTypes || DEFAULT_DOCUMENT_ACCEPTED_TYPES
  const currentDocType = getEffectiveDocumentType(currentDoc)
  const canPreviewCurrentDoc = canInlinePreview(currentDoc, currentDocUrl)
  const hasVisualThumbnail = canRenderDocumentThumbnail(currentDoc, currentDocThumbnailUrl)
  const activeDocumentSlotKey = useMemo(
    () => documents
      .filter(isActiveDocument)
      .map(doc => `${doc.slotId}:${getDocumentIdentity(doc)}`)
      .join('|'),
    [documents]
  )

  useEffect(() => {
    if (displaySlots.length === 0) return
    if (currentIndex < displaySlots.length) return
    setCurrentIndex(0)
  }, [currentIndex, displaySlots.length])

  useEffect(() => {
    if (!activeDocumentSlotKey) return
    const currentSlotHasDocument = currentSlot?.id
      ? !!getLatestActiveDocument(documents, currentSlot.id)
      : false
    if (currentSlotHasDocument) return

    const firstDocumentSlotIndex = displaySlots.findIndex(slot =>
      slot.id !== '__extra__' && !!getLatestActiveDocument(documents, slot.id)
    )
    if (firstDocumentSlotIndex >= 0) setCurrentIndex(firstDocumentSlotIndex)
  // Run when the available document set changes; manual slot navigation should remain under the user's control.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocumentSlotKey])

  useEffect(() => {
    const pathsNeedingSignedUrl = Array.from(new Set(documents.flatMap(doc => {
      const paths: string[] = []
      const signedKey = getDocumentSignedKey(doc)
      const thumbnailSignedKey = getDocumentThumbnailSignedKey(doc)
      if (signedKey && (!firstLocalDocumentUrl(doc.url, doc.previewUrl)) && !signedPreviewUrls[signedKey]) {
        paths.push(signedKey)
      }
      if (thumbnailSignedKey && !signedPreviewUrls[thumbnailSignedKey]) {
        paths.push(thumbnailSignedKey)
      }
      return paths
    })))
    if (pathsNeedingSignedUrl.length === 0) return

    let cancelled = false
    Promise.all(
      pathsNeedingSignedUrl.map(path =>
        fetch('/api/uploads/documents/signed-url', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath: path }),
        })
          .then(async response => {
            if (!response.ok) return null
            const result = await response.json()
            return [path, String(result.signedUrl || '')] as const
          })
          .catch(() => null)
      )
    ).then(items => {
      if (cancelled) return
      setSignedPreviewUrls(prev => {
        const next = { ...prev }
        items.forEach(item => {
          if (item?.[0] && item[1]) next[item[0]] = item[1]
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [documents, signedPreviewUrls])

  useEffect(() => {
    if (!previewDoc) {
      setPreviewText({ loading: false, content: '', error: '' })
      return
    }

    const previewDocSignedKey = getDocumentSignedKey(previewDoc)
    const previewDocUrl = getDocumentUrl(previewDoc) || (previewDocSignedKey ? signedPreviewUrls[previewDocSignedKey] : '')
    if (!isTextDocument(previewDoc) && !isDocxDocument(previewDoc)) {
      setPreviewText({ loading: false, content: '', error: '' })
      return
    }

    let cancelled = false
    setPreviewText({ loading: true, content: '', error: '' })
    ;(async () => {
      try {
        if (isDocxDocument(previewDoc)) {
          const mammoth = await import('mammoth/mammoth.browser')
          const arrayBuffer = previewDoc.file
            ? await readFileAsArrayBuffer(previewDoc.file)
            : await fetch(previewDocUrl, { credentials: 'same-origin' }).then(response => response.arrayBuffer())
          const result = await mammoth.extractRawText({ arrayBuffer })
          if (!cancelled) setPreviewText({ loading: false, content: result.value || 'Önizlenecek metin bulunamadı.', error: '' })
          return
        }

        const text = previewDoc.file
          ? await readFileAsText(previewDoc.file)
          : await fetch(previewDocUrl, { credentials: 'same-origin' }).then(response => response.text())
        if (!cancelled) setPreviewText({ loading: false, content: text || 'Önizlenecek metin bulunamadı.', error: '' })
      } catch (error) {
        if (!cancelled) {
          setPreviewText({
            loading: false,
            content: '',
            error: error instanceof Error ? error.message : 'Belge önizlemesi alınamadı.',
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [previewDoc, signedPreviewUrls])

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : displaySlots.length - 1))
  }, [displaySlots.length])

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < displaySlots.length - 1 ? prev + 1 : 0))
  }, [displaySlots.length])

  const handleFileSelect = useCallback(async (file: File, targetSlotId = currentSlot?.id) => {
    if (!canMutate) return
    const targetSlot = displaySlots.find(slot => slot.id === targetSlotId)
    if (!targetSlot || targetSlot.id === '__extra__') return

    // Validate file type
    const acceptedTypes = targetSlot.acceptedTypes || DEFAULT_DOCUMENT_ACCEPTED_TYPES
    if (!acceptsFileType(acceptedTypes, file.type)) {
      alert(`Invalid file type. Accepted: image, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP`)
      return
    }

    // Validate file size
    const maxSizeMB = targetSlot.maxSizeMB || 20
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
    setTimeout(async () => {
      try {
        const uploaded = await uploadDocumentFile(file, targetSlot.id)
        clearInterval(progressInterval)
        setUploadProgress(100)
        const thumbnailUrl = uploaded.thumbnailUrl || (file.type.startsWith('image/') ? uploaded.url : undefined)
        const now = new Date()
        const nextVersion = documents
          .filter(doc => doc.slotId === targetSlot.id)
          .reduce((highest, doc) => Math.max(highest, doc.version || 0), 0) + 1
      
        const newDoc: SlotDocument = {
          slotId: targetSlot.id,
          storagePath: uploaded.storagePath,
          ...(shouldKeepLocalFileForSlot(targetSlot) ? { file } : {}),
          name: uploaded.name,
          size: uploaded.size,
          type: uploaded.type,
          uploadedAt: now,
          updatedAt: now,
          status: 'active',
          version: nextVersion,
          slotTitle: targetSlot.title,
          url: uploaded.url,
          previewUrl: uploaded.url,
          thumbnailUrl,
          thumbnailPath: uploaded.thumbnailPath || undefined,
        }

        const updatedDocs = documents.map(doc =>
          doc.slotId === targetSlot.id && isActiveDocument(doc)
            ? { ...doc, status: 'archived', replacedAt: now, updatedAt: now }
            : doc
        )
        onChange([...updatedDocs, newDoc])
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Belge yüklenemedi')
      } finally {
        clearInterval(progressInterval)
        setIsUploading(false)
        setUploadProgress(0)
      }
    }, 500)
  }, [canMutate, currentSlot?.id, displaySlots, documents, onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!canMutate) return
    
    const file = e.dataTransfer.files[0]
    if (file && acceptsFileType(currentAcceptedTypes, file.type)) {
      handleFileSelect(file)
    } else {
      alert('Invalid file type. Please upload an accepted document type.')
    }
  }, [canMutate, currentAcceptedTypes, handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!canMutate) return
    setIsDragging(true)
  }, [canMutate])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDelete = useCallback(() => {
    if (!canMutate) return
    const targetDoc = deleteTargetDoc || currentDoc
    if (!targetDoc) return

    const now = new Date()
    const targetIdentity = getDocumentIdentity(targetDoc)
    const updatedDocs = documents.map(doc =>
      getDocumentIdentity(doc) === targetIdentity
        ? { ...doc, status: 'deleted', isDeleted: true, deletedAt: now, updatedAt: now }
        : doc
    )
    onChange(updatedDocs)
    setDeleteTargetDoc(null)
    setShowDeleteConfirm(false)
  }, [canMutate, currentDoc, deleteTargetDoc, documents, onChange])

  const handleExtraSlotCreate = useCallback(() => {
    if (!canMutate) return
    if (!extraSlotName.trim()) return
    
    const newSlotId = `extra_${Date.now()}`
    const newDoc: SlotDocument = {
      slotId: newSlotId,
      name: extraSlotName,
      size: 0,
      type: 'application/octet-stream',
      uploadedAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      version: 1,
      slotTitle: extraSlotName
    }
    
    onChange([...documents, newDoc])
    setExtraSlotName('')
    setShowExtraSlotInput(false)
    
    // Navigate to the new slot
    const newIndex = displaySlots.findIndex(s => s.id === newSlotId)
    if (newIndex >= 0) {
      setCurrentIndex(newIndex)
    }
  }, [canMutate, extraSlotName, documents, onChange, displaySlots])

  const handleDownload = useCallback((doc = currentDoc) => {
    if (!doc?.file && !doc?.url && !doc?.storagePath && !doc?.documentId) return
    
    // Create download link
    const signedKey = getDocumentSignedKey(doc)
    const url = getDocumentUrl(doc) || (signedKey ? signedPreviewUrls[signedKey] : '')
    if (url) {
      const link = document.createElement('a')
      link.href = url
      link.download = doc.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      if (!doc.url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [currentDoc, signedPreviewUrls])

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
    maxWidth: '196px',
    minHeight: '220px'
  }

  // Get file type config for current document
  const fileConfig = currentDoc ? getFileTypeConfig(currentDocType) : null
  const FileIcon = fileConfig?.icon || FileText
  const documentFallback = currentDoc ? (
    <div className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-2 rounded border border-gray-200 bg-white p-3 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className={cn(
        "flex h-16 w-16 items-center justify-center rounded-lg",
        fileConfig?.bgColor || 'bg-gray-100'
      )}>
        <FileIcon size={34} className={cn(fileConfig?.color || 'text-gray-600')} />
      </div>
      <span className={cn(
        "text-xs font-semibold",
        fileConfig?.color || 'text-gray-600'
      )}>
        {fileConfig?.label || 'FILE'}
      </span>
      <span className="max-w-[140px] truncate text-[10px] text-gray-500 dark:text-gray-400">
        {currentDoc.name}
      </span>
    </div>
  ) : null

  const handleReplaceDocument = (doc: SlotDocument) => {
    if (!canMutate) return
    setReplaceSlotId(doc.slotId)
    replaceFileInputRef.current?.click()
  }

  const renderDocumentList = () => (
    <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Belgeler</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Yüklenen belgeler ve önceki sürümler</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {documents.length}
        </span>
      </div>

      {sortedDocuments.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <FileText size={28} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Henüz belge yüklenmedi</p>
        </div>
      ) : (
        <div className="max-h-[360px] divide-y divide-gray-100 overflow-auto dark:divide-gray-700">
          {sortedDocuments.map((doc, index) => {
            const signedKey = getDocumentSignedKey(doc)
            const thumbnailSignedKey = getDocumentThumbnailSignedKey(doc)
            const docUrl = getDocumentUrl(doc) || (signedKey ? signedPreviewUrls[signedKey] : '')
            const thumbUrl = getDocumentThumbnailUrl(
              doc,
              thumbnailSignedKey ? signedPreviewUrls[thumbnailSignedKey] : undefined,
              signedKey ? signedPreviewUrls[signedKey] : undefined
            )
            const config = getFileTypeConfig(getEffectiveDocumentType(doc))
            const Icon = config.icon
            const slotTitle = allSlots.find(slot => slot.id === doc.slotId)?.title || doc.slotTitle || doc.slotId
            const active = isActiveDocument(doc)
            return (
              <div key={`${getDocumentIdentity(doc)}:${index}`} className="flex items-center gap-3 px-4 py-3">
                <DocumentThumbnailImage
                  key={thumbUrl || getDocumentIdentity(doc)}
                  doc={doc}
                  thumbnailUrl={thumbUrl}
                  alt={doc.name}
                  className="h-11 w-8 shrink-0 rounded border border-gray-200 object-cover object-top bg-white shadow-sm dark:border-gray-700"
                  fallback={(
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bgColor)}>
                      <Icon size={18} className={config.color} />
                    </div>
                  )}
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="block max-w-full truncate text-left text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
                    title={doc.name}
                  >
                    {doc.name}
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{slotTitle}</span>
                    <span>{formatFileSize(doc.size || 0)}</span>
                    <span>{formatDocumentDate(doc.uploadedAt)}</span>
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 font-medium",
                      active
                        ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : doc.status === 'archived'
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    )}>
                      {getDocumentStatusLabel(doc)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Önizle"
                  >
                    <Eye size={16} className="text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={!docUrl}
                    className="rounded-md p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-700"
                    title="İndir"
                  >
                    <Download size={16} className="text-gray-600 dark:text-gray-300" />
                  </button>
                  {canMutate && active && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReplaceDocument(doc)}
                        className="rounded-md p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        title="Güncelle"
                      >
                        <RefreshCw size={16} className="text-blue-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetDoc(doc)
                          setShowDeleteConfirm(true)
                        }}
                        className="rounded-md p-2 hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Sil"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const handleUploadForSlot = (slotId: string) => {
    if (!canMutate) return
    setReplaceSlotId(slotId)
    replaceFileInputRef.current?.click()
  }

  const toggleHistoryForSlot = (slotId: string) => {
    setExpandedHistorySlotIds(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    )
  }

  const renderDocumentListView = () => (
    <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Belgeler</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Aktif belgeler ve geçmiş sürümler</p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {documents.length}
        </span>
      </div>

      {allSlots.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <FileText size={28} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Tanımlı belge alanı yok</p>
        </div>
      ) : (
        <div className="max-h-[360px] divide-y divide-gray-100 overflow-auto dark:divide-gray-700">
          {allSlots.map(slot => {
            const doc = getLatestActiveDocument(documents, slot.id)
            const historyDocs = sortedDocuments.filter(item => item.slotId === slot.id && !isActiveDocument(item))
            const expanded = expandedHistorySlotIds.includes(slot.id)
            const signedKey = getDocumentSignedKey(doc)
            const thumbnailSignedKey = getDocumentThumbnailSignedKey(doc)
            const docUrl = getDocumentUrl(doc) || (signedKey ? signedPreviewUrls[signedKey] : '')
            const thumbUrl = doc ? getDocumentThumbnailUrl(
              doc,
              thumbnailSignedKey ? signedPreviewUrls[thumbnailSignedKey] : undefined,
              signedKey ? signedPreviewUrls[signedKey] : undefined
            ) : ''
            const config = getFileTypeConfig(getEffectiveDocumentType(doc))
            const Icon = config.icon
            return (
              <div key={slot.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <DocumentThumbnailImage
                    key={thumbUrl || doc?.documentId || slot.id}
                    doc={doc}
                    thumbnailUrl={thumbUrl}
                    alt={doc?.name || slot.title}
                    className="h-11 w-8 shrink-0 rounded border border-gray-200 object-cover object-top bg-white shadow-sm dark:border-gray-700"
                    fallback={(
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bgColor)}>
                        <Icon size={18} className={config.color} />
                      </div>
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">{slot.title}</span>
                      {doc ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="min-w-0 truncate text-left text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-300"
                          title={doc.name}
                        >
                          {doc.name}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">Belge yok</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      {doc ? (
                        <>
                          <span>{formatFileSize(doc.size || 0)}</span>
                          <span>{formatDocumentDate(doc.uploadedAt)}</span>
                          <span className="rounded-full bg-green-50 px-1.5 py-0.5 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">Aktif</span>
                        </>
                      ) : (
                        <span>Bu belge alanına henüz dosya yüklenmedi</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleHistoryForSlot(slot.id)}
                      disabled={historyDocs.length === 0}
                      className="rounded-md p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-700"
                      title="Geçmiş belgeler"
                    >
                      <History size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      type="button"
                      onClick={() => doc && setPreviewDoc(doc)}
                      disabled={!doc}
                      className="rounded-md p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-700"
                      title="Önizle"
                    >
                      <Eye size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      type="button"
                      onClick={() => doc && handleDownload(doc)}
                      disabled={!docUrl}
                      className="rounded-md p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-gray-700"
                      title="İndir"
                    >
                      <Download size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    {canMutate && (
                      <button
                        type="button"
                        onClick={() => handleUploadForSlot(slot.id)}
                        className="rounded-md p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        title={doc ? "Güncelle" : "Yükle"}
                      >
                        <Upload size={16} className="text-blue-600" />
                      </button>
                    )}
                    {canMutate && doc && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetDoc(doc)
                          setShowDeleteConfirm(true)
                        }}
                        className="rounded-md p-2 hover:bg-red-50 dark:hover:bg-red-900/30"
                        title="Sil"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
                {expanded && historyDocs.length > 0 && (
                  <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-4 py-3 pl-16 dark:border-gray-700 dark:bg-gray-900/40">
                    {historyDocs.map((historyDoc, index) => {
                      const historyConfig = getFileTypeConfig(getEffectiveDocumentType(historyDoc))
                      const HistoryIcon = historyConfig.icon
                      return (
                        <div key={`${getDocumentIdentity(historyDoc)}:${index}`} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", historyConfig.bgColor)}>
                            <HistoryIcon size={16} className={historyConfig.color} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(historyDoc)}
                              className="block max-w-full truncate text-left text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-300"
                              title={historyDoc.name}
                            >
                              {historyDoc.name}
                            </button>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                              <span>{formatFileSize(historyDoc.size || 0)}</span>
                              <span>{formatDocumentDate(historyDoc.uploadedAt)}</span>
                              <span>{getDocumentStatusLabel(historyDoc)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(historyDoc)}
                            className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Önizle"
                          >
                            <Eye size={16} className="text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderDocumentActions = (surface: 'inline' | 'overlay' = 'inline') => {
    if (!currentDoc) return null

    const buttonClass = surface === 'inline'
      ? 'rounded-md p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-45'
      : 'rounded-lg p-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-45'

    return (
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => currentDocUrl && setPreviewDoc(currentDoc)}
          disabled={!canPreviewCurrentDoc}
          className={cn(buttonClass, 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600')}
          title={canPreviewCurrentDoc ? 'View' : 'Önizleme hazırlanıyor'}
        >
          <Eye size={surface === 'inline' ? 16 : 18} className="text-gray-700 dark:text-gray-300" />
        </button>
        {canMutate && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(buttonClass, 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50')}
            title="Replace"
          >
            <RefreshCw size={surface === 'inline' ? 16 : 18} className="text-blue-600" />
          </button>
        )}
        <button
          type="button"
          onClick={() => handleDownload()}
          disabled={!currentDocUrl}
          className={cn(buttonClass, 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50')}
          title="Download"
        >
          <Download size={surface === 'inline' ? 16 : 18} className="text-green-600" />
        </button>
        {canMutate && (
          <button
            type="button"
            onClick={() => {
              setDeleteTargetDoc(currentDoc)
              setShowDeleteConfirm(true)
            }}
            className={cn(buttonClass, 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50')}
            title="Delete"
          >
            <Trash2 size={surface === 'inline' ? 16 : 18} className="text-red-600" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div 
      className={cn("eden-document-slot-uploader flex w-full flex-col items-center gap-4", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="hidden">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === 'upload'
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          Yükleme
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            activeTab === 'documents'
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          )}
        >
          Belgeler
        </button>
      </div>

      {activeTab === 'documents' ? renderDocumentListView() : (
      <>
      {/* Main Card */}
      <div 
        className="eden-document-slot-card relative w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
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
        <div className="eden-document-slot-header flex items-center justify-between px-2 py-1 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
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
        <div
          ref={dropZoneRef}
          onClick={canMutate && !hasDocument && currentSlot.id !== '__extra__' ? () => fileInputRef.current?.click() : undefined}
          onDrop={canMutate ? handleDrop : undefined}
          onDragOver={canMutate ? handleDragOver : undefined}
          onDragLeave={canMutate ? handleDragLeave : undefined}
          className={cn(
            "eden-document-slot-stage flex-1 flex flex-col relative",
            "bg-gray-50 dark:bg-gray-900/50",
            canMutate && !hasDocument && currentSlot.id !== '__extra__' && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900",
            isDragging && "bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400"
          )}
          style={{ height: hasDocument ? 'calc(100% - 34px)' : 'calc(100% - 78px)' }}
        >
          {hasDocument ? (
            // Uploaded State
            <div className="relative flex-1 flex flex-col p-3 group">
              {/* File Preview / Thumbnail */}
              <div className="flex-1 flex items-center justify-center">
                <DocumentThumbnailImage
                  key={currentDocThumbnailUrl || getDocumentIdentity(currentDoc)}
                  doc={currentDoc}
                  thumbnailUrl={currentDocThumbnailUrl}
                  alt={currentDoc.name}
                  className="h-full min-h-36 w-full rounded border border-gray-200 object-cover object-top shadow-sm dark:border-gray-700"
                  fallback={documentFallback}
                />
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
              {(
                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/90 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-800/90">
                  <div className="pointer-events-auto">
                    {renderDocumentActions('overlay')}
                  </div>
                </div>
              )}
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
                      {canMutate ? 'Upload' : 'Belge yok'}
                    </span>
                    {canMutate && (
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
        {canMutate && !hasDocument && currentSlot.id !== '__extra__' && (
          <div className="eden-document-slot-footer px-2 py-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
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
                  : getLatestActiveDocument(documents, slot.id)
                    ? "bg-green-400"
                    : "bg-gray-300 dark:bg-gray-600"
              )}
            />
          ))}
        </div>
      </div>
      </>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={currentAcceptedTypes.join(',')}
        capture={acceptsCameraCapture(currentAcceptedTypes) ? 'environment' : undefined}
        disabled={!canMutate}
        className="hidden"
        onChange={(e) => {
          if (!canMutate) {
            e.target.value = ''
            return
          }
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
          e.target.value = ''
        }}
      />

      <input
        ref={replaceFileInputRef}
        type="file"
        accept={(displaySlots.find(slot => slot.id === replaceSlotId)?.acceptedTypes || DEFAULT_DOCUMENT_ACCEPTED_TYPES).join(',')}
        capture={acceptsCameraCapture(displaySlots.find(slot => slot.id === replaceSlotId)?.acceptedTypes || DEFAULT_DOCUMENT_ACCEPTED_TYPES) ? 'environment' : undefined}
        disabled={!canMutate}
        className="hidden"
        onChange={(e) => {
          if (!canMutate) {
            setReplaceSlotId(null)
            e.target.value = ''
            return
          }
          const file = e.target.files?.[0]
          if (file && replaceSlotId) handleFileSelect(file, replaceSlotId)
          setReplaceSlotId(null)
          e.target.value = ''
        }}
      />

      {/* Preview Modal */}
      {previewDoc && (
        (() => {
          const previewDocSignedKey = getDocumentSignedKey(previewDoc)
          const previewDocUrl = getDocumentUrl(previewDoc) || (previewDocSignedKey ? signedPreviewUrls[previewDocSignedKey] : '')
          const previewConfig = getFileTypeConfig(getEffectiveDocumentType(previewDoc))
          const PreviewIcon = previewConfig.icon
          const canPreviewInline = canInlinePreview(previewDoc, previewDocUrl)

          return (
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
                      previewConfig.bgColor || 'bg-gray-100'
                    )}>
                      <PreviewIcon size={20} className={previewConfig.color || 'text-gray-600'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {previewDoc.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(previewDoc.size)} • {previewConfig.label || 'Document'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(previewDoc)}
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
                  {isImageDocument(previewDoc) && previewDocUrl ? (
                    <img
                      src={previewDocUrl}
                      alt={previewDoc.name}
                      className="max-w-full mx-auto rounded-lg"
                    />
                  ) : (isTextDocument(previewDoc) || isDocxDocument(previewDoc)) ? (
                    <div className="h-[60vh] w-full overflow-auto rounded-lg border border-gray-200 bg-white p-5 text-left dark:border-gray-700 dark:bg-gray-950">
                      {previewText.loading ? (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500">Önizleme hazırlanıyor...</div>
                      ) : previewText.error ? (
                        <div className="flex h-full items-center justify-center text-sm text-red-600">{previewText.error}</div>
                      ) : (
                        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-6 text-gray-800 dark:text-gray-100">
                          {previewText.content}
                        </pre>
                      )}
                    </div>
                  ) : !previewDocUrl && previewDocSignedKey ? (
                    <div className="flex h-[60vh] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
                      Önizleme hazırlanıyor...
                    </div>
                  ) : canPreviewInline ? (
                    <iframe
                      src={`${previewDocUrl}#toolbar=1&navpanes=0`}
                      title={`${previewDoc.name} preview`}
                      className="h-[60vh] w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700"
                    />
                  ) : (
                    <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-8 text-center">
                      <PreviewIcon size={64} className={cn(
                        "mx-auto mb-4",
                        previewConfig.color || 'text-gray-600'
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
                    Yüklenme tarihi {formatDocumentDate(previewDoc.uploadedAt)}
                  </span>
                  {canMutate && isActiveDocument(previewDoc) && (
                    <button
                      onClick={() => {
                        setPreviewDoc(null)
                        setDeleteTargetDoc(previewDoc)
                        setShowDeleteConfirm(true)
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Belgeyi Sil
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()
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
                Belgeyi pasife al?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              <strong>{(deleteTargetDoc || currentDoc)?.name}</strong> active listeden kaldırılacak, ancak geçmiş kayıtlar ve raporlar için saklanmaya devam edecek.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteTargetDoc(null)
                  setShowDeleteConfirm(false)
                }}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Pasife al
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentSlotUploader
