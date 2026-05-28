'use client'

import { Copy, ExternalLink, ShieldCheck, X } from 'lucide-react'
import type { AuditLogRecord } from '@/lib/audit/audit.types'
import { cn } from '@/lib/utils'

interface AuditDetailDrawerProps {
  record: AuditLogRecord | null
  onClose: () => void
  showAdminDebug?: boolean
}

const fieldLabels: Record<string, string> = {
  trade_name: 'Ticari unvan',
  address: 'Adres',
  branch_name: 'Sube adi',
  authority_limit: 'Yetki limiti',
  share_ratio: 'Pay orani',
  status: 'Durum',
  record_status: 'Kayit durumu',
}

export function AuditDetailDrawer({ record, onClose, showAdminDebug = false }: AuditDetailDrawerProps) {
  if (!record) return null
  const metadata = record.metadata_json || {}
  const correlationId = metadata.correlation_id || metadata.correlationId || null
  const recordLabel = metadata.record_label || metadata.recordLabel || record.entity_id || '-'
  const oldValues = record.old_values || {}
  const newValues = record.new_values || {}
  const fields = record.changed_fields?.length
    ? record.changed_fields
    : Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]))

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="h-full w-full max-w-3xl overflow-y-auto border-l border-border bg-background shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Denetim detayi
            </div>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{record.summary || actionLabel(record.action_type)}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(record.created_at)} - {record.user_label || record.user_id || 'Sistem'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
            aria-label="Denetim detayini kapat"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 p-5">
          <section className="grid gap-3 sm:grid-cols-2">
            <Info label="Modul" value={record.module_key} />
            <Info label="Islem" value={record.action_key || record.action_type} />
            <Info label="Kayit" value={`${record.entity_type || '-'} / ${recordLabel}`} />
            <Info label="Sonuc" value={resultLabel(record.result_status)} tone={resultTone(record.result_status)} />
            <Info label="Onem" value={severityLabel(record.severity)} tone={severityTone(record.severity)} />
            <Info label="Sirket / Sube" value={[record.company_id, record.branch_id].filter(Boolean).join(' / ') || '-'} />
          </section>

          <section className="rounded-md border border-border p-4">
            <h3 className="text-sm font-semibold">Baglantilar</h3>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Copyable label="Request ID" value={record.request_id} />
              <Copyable label="Correlation ID" value={correlationId ? String(correlationId) : null} />
              <Copyable label="Operation ID" value={record.operation_id} href={record.operation_id ? `/app/surecler?operation_id=${record.operation_id}` : undefined} />
              <Copyable label="Process ID" value={record.process_instance_id} href={record.process_instance_id ? `/app/surecler/${record.process_instance_id}` : undefined} />
              <Copyable label="Task ID" value={record.task_id} />
              <Copyable label="Approval ID" value={record.approval_id} />
            </div>
          </section>

          {record.reason ? (
            <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              {record.reason}
            </section>
          ) : null}

          <section className="rounded-md border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Degisen alanlar</h3>
              <p className="text-xs text-muted-foreground">Hassas veriler guvenlik nedeniyle maskelenmistir.</p>
            </div>
            {fields.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Alan</th>
                      <th className="py-2 pr-4">Eski deger</th>
                      <th className="py-2">Yeni deger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {fields.map(field => (
                      <tr key={field}>
                        <td className="py-2 pr-4 font-medium">{fieldLabels[field] || field}</td>
                        <td className="max-w-xs py-2 pr-4 text-muted-foreground">{displayValue(oldValues[field])}</td>
                        <td className="max-w-xs py-2">{displayValue(newValues[field])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Bu audit kaydinda alan degisikligi bulunmuyor.</p>
            )}
          </section>

          {showAdminDebug ? (
            <details className="rounded-md border border-border p-4">
              <summary className="cursor-pointer text-sm font-semibold">Admin teknik detay</summary>
              <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {JSON.stringify(sanitizeDebug(record), null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function Info({ label, value, tone }: { label: string; value?: string | null; tone?: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 break-words text-sm font-medium', tone)}>{value || '-'}</div>
    </div>
  )
}

function Copyable({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  const copy = async () => {
    if (value) await navigator.clipboard?.writeText(value)
  }
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-xs">{value || '-'}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {href ? (
          <a className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-background" href={href} aria-label={`${label} baglantisini ac`}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : null}
        <button type="button" onClick={copy} disabled={!value} className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-background disabled:opacity-40" aria-label={`${label} kopyala`}>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function actionLabel(value?: string | null) {
  if (!value) return 'Denetim kaydi'
  const labels: Record<string, string> = {
    permission_denied: 'Yetki reddi',
    policy_denied: 'Politika reddi',
    scope_denied: 'Kapsam reddi',
    operation_fail: 'Tamamlanamayan islem',
    operation_complete: 'Islem tamamlandi',
    process_approve: 'Onay verildi',
    process_reject: 'Onay reddedildi',
    export: 'Denetim raporu export',
  }
  return labels[value] || value.replace(/_/g, ' ')
}

function resultLabel(value?: string | null) {
  if (value === 'denied') return 'Reddedildi'
  if (value === 'failed') return 'Basarisiz'
  if (value === 'pending') return 'Bekliyor'
  return 'Basarili'
}

function severityLabel(value?: string | null) {
  if (value === 'critical') return 'Kritik'
  if (value === 'error') return 'Hata'
  if (value === 'warning') return 'Uyari'
  return 'Bilgi'
}

function resultTone(value?: string | null) {
  if (value === 'denied' || value === 'failed') return 'text-red-700 dark:text-red-300'
  if (value === 'pending') return 'text-amber-700 dark:text-amber-300'
  return 'text-emerald-700 dark:text-emerald-300'
}

function severityTone(value?: string | null) {
  if (value === 'critical' || value === 'error') return 'text-red-700 dark:text-red-300'
  if (value === 'warning') return 'text-amber-700 dark:text-amber-300'
  return 'text-muted-foreground'
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('tr-TR')
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') {
    if (/token|signed|secret|password/i.test(value) || value.includes('supabase.co/storage')) return '***'
    return value.length > 120 ? `${value.slice(0, 120)}...` : value
  }
  return JSON.stringify(value)
}

function sanitizeDebug(record: AuditLogRecord) {
  const clone = JSON.parse(JSON.stringify(record))
  delete clone.ip_address
  delete clone.user_agent
  return clone
}
