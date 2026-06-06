'use client'

import { Camera, FilePlus2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { DocumentDuplicateNotice } from './DocumentDuplicateNotice'
import { DocumentPreview } from './DocumentPreview'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import { documentService, type DocumentRecord, type DocumentRelationType } from '@/lib/services/documents'

export type DocumentSlotDefinition = {
  documentType: string
  title: string
  category?: string
  required?: boolean
  description?: string
  acceptedFileTypes?: string[]
  maxSizeMB?: number
  relationType?: DocumentRelationType
  documentSlotKey?: string
}

type Props = {
  entityType: string
  entityId: string
  slot: DocumentSlotDefinition
  document?: DocumentRecord | null
  readOnly?: boolean
  allowCamera?: boolean
  moduleKey?: string
  operationKey?: string
  operationId?: string
  onUploaded?: (document: DocumentRecord) => void
}

export function DocumentSlot({ entityType, entityId, slot, document, readOnly, allowCamera, moduleKey, operationKey, operationId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cameraRef = useRef<HTMLInputElement | null>(null)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [replaceTarget, setReplaceTarget] = useState<DocumentRecord | null>(null)

  async function upload(file: File | null, replaceDocument?: DocumentRecord | null) {
    if (!file || readOnly) return
    setWorking(true)
    setError('')
    try {
      const payload = {
        file,
        owner_entity_type: entityType,
        owner_entity_id: entityId,
        document_type: slot.documentType,
        document_category: slot.category || categoryFor(entityType),
        title: slot.title,
        required: Boolean(slot.required),
        relation_type: slot.relationType || 'attachment',
        verification_required: Boolean(slot.required),
        module_key: moduleKey || categoryFor(entityType),
        operation_key: operationKey || null,
        operation_id: operationId || null,
        document_slot_key: slot.documentSlotKey || slot.documentType,
      }
      const uploaded = replaceDocument
        ? await documentService.newVersion(replaceDocument.id, payload)
        : await documentService.uploadForEntity(entityType, entityId, payload)
      onUploaded?.(uploaded)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Belge yuklenemedi.')
    } finally {
      setWorking(false)
      setReplaceTarget(null)
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{slot.title}</h3>
          {slot.description ? <p className="mt-1 text-xs text-muted-foreground">{slot.description}</p> : null}
        </div>
        <DocumentStatusBadge status={document?.status || 'missing'} verificationStatus={document?.verification_status} required={slot.required} />
      </div>

      <div className="mt-4">
        <DocumentPreview document={document || null} />
      </div>
      <DocumentDuplicateNotice document={document || null} />

      {!readOnly ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept={(slot.acceptedFileTypes || defaultAccepted()).join(',')} className="hidden" onChange={event => upload(event.target.files?.[0] || null, replaceTarget)} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => upload(event.target.files?.[0] || null, null)} />
          <button type="button" onClick={() => { setReplaceTarget(null); inputRef.current?.click() }} disabled={working} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Yukle
          </button>
          {document ? (
            <button type="button" onClick={() => { setReplaceTarget(document); inputRef.current?.click() }} disabled={working} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              Yeni Versiyon
            </button>
          ) : null}
          {allowCamera ? (
            <button type="button" onClick={() => cameraRef.current?.click()} disabled={working} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50">
              <Camera className="h-4 w-4" aria-hidden="true" />
              Kamera
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}

function defaultAccepted() {
  return ['application/pdf', 'image/*', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt']
}

function categoryFor(entityType: string) {
  if (entityType.includes('company')) return 'company'
  if (entityType.includes('employee')) return 'hr'
  if (entityType.includes('service')) return 'after_sales'
  if (entityType.includes('import') || entityType.includes('export')) return 'import_export'
  return 'general'
}
