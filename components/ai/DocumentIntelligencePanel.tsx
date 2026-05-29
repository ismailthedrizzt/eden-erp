'use client'

import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { aiCopilotService, type CopilotResponse } from '@/lib/services/ai'
import { CopilotMessage } from './CopilotMessage'

interface DocumentIntelligencePanelProps {
  documentId?: string | null
  documentName?: string | null
}

export function DocumentIntelligencePanel({ documentId, documentName }: DocumentIntelligencePanelProps) {
  const [text, setText] = useState('')
  const [response, setResponse] = useState<CopilotResponse | null>(null)
  const [loading, setLoading] = useState(false)

  async function summarize() {
    setLoading(true)
    try {
      const data = await aiCopilotService.documentSummary({
        document_id: documentId,
        document_name: documentName,
        document_text: text,
      })
      setResponse(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
          <FileText size={16} />
          Belge zekasi
        </div>
        <button
          type="button"
          onClick={summarize}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
          Ozetle
        </button>
      </div>
      <textarea
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder="OCR/metin mevcutsa buraya yapistirin."
        className="min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      {response ? <CopilotMessage response={response} /> : null}
    </section>
  )
}
