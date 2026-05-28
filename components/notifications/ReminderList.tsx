'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { reminderService, type ReminderRecord } from '@/lib/services/notifications'

export function ReminderList() {
  const [rows, setRows] = useState<ReminderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await reminderService.list({ pageSize: 50 })
      setRows(result.data)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Hatirlatmalar alinamadi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function cancel(id: string) {
    await reminderService.cancel(id)
    await load()
  }

  return (
    <section className="rounded-md border border-border bg-card p-4">
      <h2 className="text-base font-semibold">Hatirlatmalar</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Baslik</th>
              <th className="px-3 py-2">Modul</th>
              <th className="px-3 py-2">Zaman</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground"><Loader2 size={18} className="mx-auto animate-spin" /></td></tr>
            )}
            {!loading && error && <tr><td colSpan={5} className="px-3 py-4 text-red-600">{error}</td></tr>}
            {!loading && !error && rows.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-muted-foreground">Hatirlatma yok.</td></tr>}
            {!loading && !error && rows.map(row => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{row.title}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.module_key}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(row.remind_at)}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2 text-right">
                  {row.status === 'scheduled' && (
                    <button type="button" onClick={() => void cancel(row.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted" title="Iptal">
                      <X size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

