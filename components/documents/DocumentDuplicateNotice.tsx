'use client'

import { Info, TriangleAlert } from 'lucide-react'
import type { DocumentRecord } from '@/lib/services/documents'

type Props = {
  document?: DocumentRecord | null
}

export function DocumentDuplicateNotice({ document }: Props) {
  if (!document?.reused_existing_file) return null
  const hasWarning = Boolean(document.duplicate_warning)
  const Icon = hasWarning ? TriangleAlert : Info
  return (
    <div className={`mt-3 flex gap-2 rounded-md border px-3 py-2 text-xs ${hasWarning ? 'border-amber-500/40 bg-amber-500/10 text-foreground' : 'border-sky-500/40 bg-sky-500/10 text-foreground'}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        {document.duplicate_warning || 'Belge eklendi. Bu dosya daha once sisteme yuklendigi icin mevcut dosya yeniden kullanildi.'}
      </span>
    </div>
  )
}
