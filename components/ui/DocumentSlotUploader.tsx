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
  Sparkles
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
  uploadedAt?: Date
  url?: string
  previewUrl?: string
  thumbnailUrl?: string
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

function getEffectiveDocumentType(doc?: SlotDocument | null) {
  const type = doc?.type || ''
  if (type && type !== 'application/octet-stream') return type

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

function getDocumentThumbnailUrl(doc?: SlotDocument | null, signedUrl?: string) {
  if (!doc) return ''
  if (doc.thumbnailUrl) return doc.thumbnailUrl
  if (isImageDocument(doc)) return doc.previewUrl || signedUrl || doc.url || (doc.file ? URL.createObjectURL(doc.file) : '')
  return ''
}

async function uploadDocumentFile(file: File, slotId: string) {
  const body = new FormData()
  body.append('file', file)
  body.append('slotId', slotId)

  const response = await fetch('/api/uploads/documents', {
    method: 'POST',
    body,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || 'Belge yüklenemedi')
  }

  return {
    storagePath: String(result.storagePath || ''),
    url: String(result.url || ''),
    name: String(result.name || file.name),
    size: Number(result.size || file.size),
    type: String(result.type || file.type || 'application/octet-stream'),
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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

function dataUrlToBytes(dataUrl: string) {
  const [header, payload = ''] = dataUrl.split(',')
  if (!header.includes(';base64')) {
    return new TextEncoder().encode(decodeURIComponent(payload))
  }
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function pdfSourceToBytes(source: File | string) {
  if (typeof source !== 'string') return new Uint8Array(await readFileAsArrayBuffer(source))
  if (source.startsWith('data:')) return dataUrlToBytes(source)

  const response = await fetch(source)
  if (!response.ok) throw new Error(`PDF okunamadi: ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

async function generatePdfThumbnail(source: File | string) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const data = await pdfSourceToBytes(source)
  const pdf = await pdfjs.getDocument({ data }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 0.42 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return ''

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvasContext: context as any, viewport, canvas: canvas as any }).promise
  await pdf.destroy()

  return canvas.toDataURL('image/jpeg', 0.78)
}

function generateFallbackDocumentThumbnail(label: string, title = 'Belge') {
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 510
  const context = canvas.getContext('2d')
  if (!context) return ''

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#e5e7eb'
  context.lineWidth = 2
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)
  context.fillStyle = label === 'PDF' ? '#dc2626' : '#2563eb'
  context.fillRect(52, 72, 256, 118)
  context.fillStyle = '#ffffff'
  context.font = 'bold 54px Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText(label, 180, 148)
  context.fillStyle = '#111827'
  context.font = 'bold 20px Arial, sans-serif'
  context.fillText(title.slice(0, 24), 180, 238)
  context.fillStyle = '#9ca3af'
  for (let index = 0; index < 9; index += 1) {
    context.fillRect(58, 285 + index * 18, 244 - (index % 3) * 26, 7)
  }
  return canvas.toDataURL('image/jpeg', 0.82)
}

function generateTextThumbnail(text: string, title = 'Belge') {
  const canvas = document.createElement('canvas')
  canvas.width = 360
  canvas.height = 510
  const context = canvas.getContext('2d')
  if (!context) return ''

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#f3f4f6'
  context.fillRect(0, 0, canvas.width, 52)
  context.fillStyle = '#111827'
  context.font = 'bold 18px Arial, sans-serif'
  context.fillText(title.slice(0, 28), 22, 33)
  context.font = '14px Arial, sans-serif'
  context.fillStyle = '#374151'

  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width > 310) {
      if (line) lines.push(line)
      line = word
    } else {
      line = candidate
    }
  })
  if (line) lines.push(line)

  lines.slice(0, 23).forEach((item, index) => {
    context.fillText(item, 22, 82 + index * 18)
  })
  return canvas.toDataURL('image/jpeg', 0.82)
}

async function createDocumentPreviewMetadata(file: File) {
  const type = file.type || getEffectiveDocumentType({ slotId: 'preview', file, name: file.name, size: file.size, type: file.type })

  if (type.startsWith('image/')) {
    const dataUrl = await readFileAsDataUrl(file)
    return { url: dataUrl, thumbnailUrl: dataUrl }
  }

  if (type === 'application/pdf') {
    const [url, thumbnailUrl] = await Promise.all([
      readFileAsDataUrl(file),
      generatePdfThumbnail(file).catch(() => generateFallbackDocumentThumbnail('PDF', file.name)),
    ])
    return { url, thumbnailUrl: thumbnailUrl || undefined }
  }

  if (isTextDocument({ slotId: 'preview', file, name: file.name, size: file.size, type })) {
    const text = await readFileAsText(file)
    return {
      url: `data:${type || 'text/plain'};charset=utf-8,${encodeURIComponent(text)}`,
      thumbnailUrl: generateTextThumbnail(text, file.name),
    }
  }

  return { url: await readFileAsDataUrl(file), thumbnailUrl: generateFallbackDocumentThumbnail('DOC', file.name) }
}

export function DocumentSlotUploader({
  slots,
  documents,
  onChange,
  allowExtraSlots = true,
  readOnly = false,
  aiBadge,
  className
}: DocumentSlotUploaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<SlotDocument | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [extraSlotName, setExtraSlotName] = useState('')
  const [showExtraSlotInput, setShowExtraSlotInput] = useState(false)
  const [signedPreviewUrls, setSignedPreviewUrls] = useState<Record<string, string>>({})
  const [generatedThumbnails, setGeneratedThumbnails] = useState<Record<string, string>>({})
  const [previewText, setPreviewText] = useState<{ loading: boolean; content: string; error: string }>({ loading: false, content: '', error: '' })
  
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
  const currentDocSignedKey = currentDoc?.storagePath || currentDoc?.documentId || ''
  const currentDocKey = currentDoc ? currentDocSignedKey || `${currentDoc.slotId}:${currentDoc.name}:${currentDoc.size}` : ''
  const currentDocUrl = getDocumentUrl(currentDoc) || (currentDocSignedKey ? signedPreviewUrls[currentDocSignedKey] : '')
  const currentDocThumbnailUrl = currentDoc?.thumbnailUrl || (currentDocKey ? generatedThumbnails[currentDocKey] : '') || getDocumentThumbnailUrl(currentDoc, currentDocSignedKey ? signedPreviewUrls[currentDocSignedKey] : undefined)
  const hasDocument = !!currentDoc
  const currentAcceptedTypes = currentSlot?.acceptedTypes || DEFAULT_DOCUMENT_ACCEPTED_TYPES
  const currentDocType = getEffectiveDocumentType(currentDoc)
  const canPreviewCurrentDoc = canInlinePreview(currentDoc, currentDocUrl)
  const hasVisualThumbnail = Boolean(currentDocThumbnailUrl)

  useEffect(() => {
    const docsNeedingSignedUrl = documents.filter(doc =>
      doc.storagePath &&
      !doc.url &&
      !doc.previewUrl &&
      !signedPreviewUrls[doc.storagePath]
    )
    if (docsNeedingSignedUrl.length === 0) return

    let cancelled = false
    Promise.all(
      docsNeedingSignedUrl.map(doc =>
        fetch('/api/uploads/documents/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath: doc.storagePath }),
        })
          .then(async response => {
            if (!response.ok) return null
            const result = await response.json()
            return [doc.storagePath!, String(result.signedUrl || '')] as const
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
    const docsNeedingThumbnail = documents.filter(doc => {
      const signedKey = doc.storagePath || doc.documentId || ''
      const key = signedKey || `${doc.slotId}:${doc.name}:${doc.size}`
      const url = doc.url || doc.previewUrl || (signedKey ? signedPreviewUrls[signedKey] : '')
      return !doc.thumbnailUrl && !generatedThumbnails[key] && url && (isPdfDocument(doc) || isTextDocument(doc))
    })
    if (docsNeedingThumbnail.length === 0) return

    let cancelled = false
    Promise.all(docsNeedingThumbnail.map(async doc => {
      const signedKey = doc.storagePath || doc.documentId || ''
      const key = signedKey || `${doc.slotId}:${doc.name}:${doc.size}`
      const url = doc.url || doc.previewUrl || (signedKey ? signedPreviewUrls[signedKey] : '') || ''
      try {
        if (isPdfDocument(doc)) return [key, await generatePdfThumbnail(url)] as const
        const response = await fetch(url)
        const text = await response.text()
        return [key, generateTextThumbnail(text, doc.name)] as const
      } catch {
        return [key, generateFallbackDocumentThumbnail(isPdfDocument(doc) ? 'PDF' : 'TXT', doc.name)] as const
      }
    })).then(items => {
      if (cancelled) return
      const next = Object.fromEntries(items.filter((item): item is readonly [string, string] => !!item?.[1]))
      if (Object.keys(next).length > 0) {
        setGeneratedThumbnails(prev => ({ ...prev, ...next }))
        onChange(documents.map(doc => {
          const key = doc.storagePath || doc.documentId || `${doc.slotId}:${doc.name}:${doc.size}`
          return next[key] && !doc.thumbnailUrl ? { ...doc, thumbnailUrl: next[key] } : doc
        }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [documents, generatedThumbnails, onChange, signedPreviewUrls])

  useEffect(() => {
    if (!previewDoc) {
      setPreviewText({ loading: false, content: '', error: '' })
      return
    }

    const previewDocSignedKey = previewDoc.storagePath || previewDoc.documentId || ''
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
            : await fetch(previewDocUrl).then(response => response.arrayBuffer())
          const result = await mammoth.extractRawText({ arrayBuffer })
          if (!cancelled) setPreviewText({ loading: false, content: result.value || 'Önizlenecek metin bulunamadı.', error: '' })
          return
        }

        const text = previewDoc.file
          ? await readFileAsText(previewDoc.file)
          : await fetch(previewDocUrl).then(response => response.text())
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
    setTimeout(async () => {
      try {
        const [preview, uploaded] = await Promise.all([
          createDocumentPreviewMetadata(file).catch(() => ({ url: '', thumbnailUrl: undefined })),
          uploadDocumentFile(file, currentSlot.id),
        ])
        clearInterval(progressInterval)
        setUploadProgress(100)
        const thumbnailUrl = file.type.startsWith('image/') ? uploaded.url : preview.thumbnailUrl
      
        const newDoc: SlotDocument = {
          slotId: currentSlot.id,
          storagePath: uploaded.storagePath,
          name: uploaded.name,
          size: uploaded.size,
          type: uploaded.type,
          uploadedAt: new Date(),
          url: uploaded.url,
          previewUrl: uploaded.url,
          thumbnailUrl,
        }

        const updatedDocs = documents.filter(doc => doc.slotId !== currentSlot.id)
        onChange([...updatedDocs, newDoc])
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Belge yüklenemedi')
      } finally {
        clearInterval(progressInterval)
        setIsUploading(false)
        setUploadProgress(0)
      }
    }, 500)
  }, [currentSlot, documents, onChange])

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
    if (!currentDoc?.file && !currentDoc?.url && !currentDoc?.storagePath && !currentDoc?.documentId) return
    
    // Create download link
    const signedKey = currentDoc.storagePath || currentDoc.documentId || ''
    const url = getDocumentUrl(currentDoc) || (signedKey ? signedPreviewUrls[signedKey] : '')
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
    maxWidth: '280px',
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
        <div
          ref={dropZoneRef}
          onClick={!readOnly && !hasDocument && currentSlot.id !== '__extra__' ? () => fileInputRef.current?.click() : undefined}
          onDrop={!readOnly ? handleDrop : undefined}
          onDragOver={!readOnly ? handleDragOver : undefined}
          onDragLeave={!readOnly ? handleDragLeave : undefined}
          className={cn(
            "flex-1 flex flex-col relative",
            "bg-gray-50 dark:bg-gray-900/50",
            !readOnly && !hasDocument && currentSlot.id !== '__extra__' && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900",
            isDragging && "bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-400"
          )}
          style={{ height: hasDocument ? 'calc(100% - 34px)' : 'calc(100% - 78px)' }}
        >
          {hasDocument ? (
            // Uploaded State
            <div className="relative flex-1 flex flex-col p-3 group">
              {/* File Preview / Thumbnail */}
              <div className="flex-1 flex items-center justify-center">
                {hasVisualThumbnail ? (
                  <img
                    src={currentDocThumbnailUrl}
                    alt={currentDoc.name}
                    className="h-full min-h-36 w-full rounded border border-gray-200 object-cover object-top shadow-sm dark:border-gray-700"
                  />
                ) : (
                  documentFallback
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
              {(
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/90 opacity-100 transition-colors group-hover:bg-white/95 group-focus-within:bg-white/95 dark:bg-gray-800/90 dark:group-hover:bg-gray-800/95 dark:group-focus-within:bg-gray-800/95">
                  {!currentDocUrl && currentDoc?.storagePath && (
                    <div className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      Bağlantı hazırlanıyor
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => currentDocUrl && setPreviewDoc(currentDoc || null)}
                      disabled={!canPreviewCurrentDoc}
                      className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                      title={canPreviewCurrentDoc ? 'View' : 'Önizleme hazırlanıyor'}
                    >
                      <Eye size={18} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        title="Replace"
                      >
                        <RefreshCw size={18} className="text-blue-600" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={!currentDocUrl}
                      className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                      title="Download"
                    >
                      <Download size={18} className="text-green-600" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    )}
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
        {!readOnly && !hasDocument && currentSlot.id !== '__extra__' && (
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
        (() => {
          const previewDocSignedKey = previewDoc.storagePath || previewDoc.documentId || ''
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
