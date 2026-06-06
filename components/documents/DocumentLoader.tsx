'use client'

import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DocumentRequirementList } from './DocumentRequirementList'
import { DocumentSlot, type DocumentSlotDefinition } from './DocumentSlot'
import { documentService, type DocumentRecord } from '@/lib/services/documents'

type Props = {
  entityType: string
  entityId: string
  moduleKey: string
  operationKey?: string
  requiredTypes?: DocumentSlotDefinition[]
  allowMultiple?: boolean
  readOnly?: boolean
  uploadMode?: 'replace' | 'newVersion' | 'append'
  onChange?: (documents: DocumentRecord[]) => void
}

export function DocumentLoader({
  entityType,
  entityId,
  moduleKey,
  operationKey,
  requiredTypes = [],
  allowMultiple = true,
  readOnly,
  onChange,
}: Props) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await documentService.byEntity(entityType, entityId)
      setDocuments(data)
      onChange?.(data)
    } finally {
      setLoading(false)
    }
  }, [entityId, entityType, onChange])

  useEffect(() => {
    void load()
  }, [load])

  function handleUploaded(document: DocumentRecord) {
    const next = upsertDocument(documents, document)
    setDocuments(next)
    onChange?.(next)
  }

  const slots = useMemo(() => {
    const configured = requiredTypes.length ? requiredTypes : defaultSlots(entityType)
    if (allowMultiple && !configured.some(slot => slot.documentType === 'other_document')) {
      return [...configured, { documentType: 'other_document', title: 'Diger Belge', category: 'general' }]
    }
    return configured
  }, [allowMultiple, entityType, requiredTypes])

  const activeSlot = slots[Math.min(activeIndex, Math.max(0, slots.length - 1))]
  const byType = useMemo(() => new Map(documents.map(item => [item.document_type, item])), [documents])

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-base font-semibold">Belgeler</h2>
          <p className="text-sm text-muted-foreground">{documents.length} belge · {entityType}/{entityId}</p>
        </div>
        <button type="button" onClick={load} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-muted">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Yenile
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <button type="button" disabled={activeIndex <= 0} onClick={() => setActiveIndex(index => Math.max(0, index - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40" aria-label="Onceki belge slotu">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0 text-center text-sm text-muted-foreground">
              {activeIndex + 1} / {slots.length}
            </div>
            <button type="button" disabled={activeIndex >= slots.length - 1} onClick={() => setActiveIndex(index => Math.min(slots.length - 1, index + 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40" aria-label="Sonraki belge slotu">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {loading ? (
            <div className="rounded-md border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">Belgeler yukleniyor.</div>
          ) : activeSlot ? (
            <DocumentSlot
              entityType={entityType}
              entityId={entityId}
              slot={activeSlot}
              document={byType.get(activeSlot.documentType)}
              readOnly={readOnly}
              allowCamera
              moduleKey={moduleKey}
              operationKey={operationKey}
              onUploaded={handleUploaded}
            />
          ) : null}
        </div>

        <DocumentRequirementList
          moduleKey={moduleKey}
          operationKey={operationKey}
          entityType={entityType}
          documents={documents}
        />
      </div>
    </div>
  )
}

function upsertDocument(documents: DocumentRecord[], document: DocumentRecord) {
  const index = documents.findIndex(item => item.id === document.id || item.document_type === document.document_type)
  if (index === -1) return [document, ...documents]
  return documents.map((item, itemIndex) => itemIndex === index ? document : item)
}

function defaultSlots(entityType: string): DocumentSlotDefinition[] {
  if (entityType === 'employee') {
    return [
      { documentType: 'employee.identity_document', title: 'Kimlik', category: 'hr', required: true },
      { documentType: 'employee.sgk_entry', title: 'SGK Giris Bildirgesi', category: 'hr' },
      { documentType: 'contract.signed_contract', title: 'Sozlesme', category: 'hr' },
    ]
  }
  if (entityType === 'service_record') {
    return [
      { documentType: 'service.service_photo', title: 'Servis Fotografi', category: 'after_sales', relationType: 'service_photo' },
      { documentType: 'customer_signature', title: 'Musteri Imzasi', category: 'after_sales' },
    ]
  }
  return [
    { documentType: 'company.trade_registry_gazette', title: 'Ticaret Sicil Gazetesi', category: 'company', required: true },
    { documentType: 'company.signature_circular', title: 'Imza Sirkuleri', category: 'company' },
    { documentType: 'company.tax_certificate', title: 'Vergi Levhasi', category: 'company' },
  ]
}
