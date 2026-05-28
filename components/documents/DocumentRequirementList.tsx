'use client'

import { FileCheck2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import { documentRequirementsService, type DocumentRecord, type DocumentRequirement } from '@/lib/services/documents'

type Props = {
  moduleKey: string
  operationKey?: string
  entityType?: string
  documents?: DocumentRecord[]
}

export function DocumentRequirementList({ moduleKey, operationKey, entityType, documents = [] }: Props) {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    documentRequirementsService
      .list({ module_key: moduleKey, operation_key: operationKey, entity_type: entityType })
      .then(data => {
        if (active) setRequirements(data)
      })
      .catch(() => {
        if (active) setRequirements([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [moduleKey, operationKey, entityType])

  const byType = useMemo(() => new Map(documents.map(item => [item.document_type, item])), [documents])

  if (loading) {
    return <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">Belge gereksinimleri yukleniyor.</div>
  }

  if (!requirements.length) {
    return <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">Bu operasyon icin tanimli belge gereksinimi yok.</div>
  }

  return (
    <div className="space-y-2">
      {requirements.map(requirement => {
        const current = byType.get(requirement.document_type)
        return (
          <div key={requirement.requirement_key} className="flex items-start justify-between gap-3 rounded-md border border-border bg-background p-3">
            <div className="flex min-w-0 items-start gap-2">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{requirement.document_type}</p>
                {requirement.description ? <p className="mt-1 text-xs text-muted-foreground">{requirement.description}</p> : null}
              </div>
            </div>
            <DocumentStatusBadge status={current ? current.status : 'missing'} verificationStatus={current?.verification_status} required={requirement.required} />
          </div>
        )
      })}
    </div>
  )
}

