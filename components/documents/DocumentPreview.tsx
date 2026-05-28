'use client'

import { Download, ExternalLink, File, FileImage, FileSpreadsheet, FileText } from 'lucide-react'
import { useState } from 'react'
import { cn, formatFileSize } from '@/lib/utils'
import { documentService, type DocumentRecord } from '@/lib/services/documents'

type Props = {
  document?: DocumentRecord | null
  className?: string
}

export function DocumentPreview({ document, className }: Props) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function openPreview() {
    if (!document) return
    setLoading(true)
    setError('')
    try {
      const signed = await documentService.previewUrl(document.id)
      setPreviewUrl(signed.url)
      window.open(signed.url, '_blank', 'noopener,noreferrer')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Onizleme acilamadi.')
    } finally {
      setLoading(false)
    }
  }

  async function download() {
    if (!document) return
    setLoading(true)
    setError('')
    try {
      const signed = await documentService.downloadUrl(document.id)
      window.open(signed.url, '_blank', 'noopener,noreferrer')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Indirme URL uretilemedi.')
    } finally {
      setLoading(false)
    }
  }

  if (!document) {
    return (
      <div className={cn('flex min-h-52 flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground', className)}>
        <File className="mb-2 h-8 w-8" aria-hidden="true" />
        Belge yok
      </div>
    )
  }

  const Icon = iconFor(document.mime_type, document.file_name)

  return (
    <div className={cn('rounded-md border border-border bg-background p-4', className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
          <Icon className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{document.title || document.file_name}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{document.file_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {document.document_type} · {formatFileSize(Number(document.file_size || 0))}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={openPreview} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Onizle
        </button>
        <button type="button" onClick={download} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
          <Download className="h-4 w-4" aria-hidden="true" />
          Indir
        </button>
      </div>
      {previewUrl ? <p className="mt-3 text-xs text-muted-foreground">Signed URL kisa sureli uretildi.</p> : null}
      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

function iconFor(mimeType: string, fileName: string) {
  const lower = `${mimeType} ${fileName}`.toLowerCase()
  if (lower.includes('image/')) return FileImage
  if (lower.includes('pdf')) return FileText
  if (lower.includes('excel') || lower.includes('spreadsheet') || lower.endsWith('.csv')) return FileSpreadsheet
  return File
}

