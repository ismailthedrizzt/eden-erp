'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Mail, RefreshCw, RotateCcw, Send } from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import { emailService, type EmailMessageRecord } from '@/lib/services/notifications'

type ToastState = { type: ToastType; title?: string; message: string }

const statuses = ['queued', 'sending', 'sent', 'failed', 'skipped']

export default function SystemEmailPage() {
  const [emails, setEmails] = useState<EmailMessageRecord[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [testEmail, setTestEmail] = useState({
    to_email: '',
    subject: 'Eden ERP test e-postasi',
    message: 'Bu mesaj bildirim sistemi test kuyrugu tarafindan olusturuldu.',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await emailService.list({ status: status || undefined, pageSize: 100 })
      setEmails(result.data)
    } catch (error) {
      setToast({ type: 'error', title: 'E-postalar alinamadi', message: errorMessage(error) })
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(() => ({
    queued: emails.filter(email => email.status === 'queued').length,
    sent: emails.filter(email => email.status === 'sent').length,
    failed: emails.filter(email => email.status === 'failed').length,
    skipped: emails.filter(email => email.status === 'skipped').length,
  }), [emails])

  async function retry(messageId: string) {
    setWorking(true)
    try {
      await emailService.retry(messageId)
      setToast({ type: 'success', message: 'E-posta yeniden kuyruga alindi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Retry basarisiz', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  async function sendTest() {
    if (!testEmail.to_email.trim()) {
      setToast({ type: 'warning', title: 'E-posta gerekli', message: 'Test e-postasi icin alici adresi girilmelidir.' })
      return
    }
    setWorking(true)
    try {
      await emailService.test(testEmail)
      setToast({ type: 'success', message: 'Test e-postasi kuyruga alindi.' })
      await load()
    } catch (error) {
      setToast({ type: 'error', title: 'Test e-postasi olusturulamadi', message: errorMessage(error) })
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Sistem E-postalari</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                E-posta kuyrugu, retry durumu, SMTP testleri ve teslimat izleri.
              </p>
            </div>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Yenile
          </button>
        </header>

        <section className="grid gap-3 md:grid-cols-4">
          <Metric label="Queued" value={summary.queued} />
          <Metric label="Sent" value={summary.sent} tone="emerald" />
          <Metric label="Failed" value={summary.failed} tone="red" />
          <Metric label="Skipped" value={summary.skipped} tone="amber" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <label className="block min-w-52 text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Durum</span>
                <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                  <option value="">Tum</option>
                  {statuses.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <button type="button" onClick={load} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                Filtrele
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Alici</th>
                    <th className="px-3 py-2">Konu</th>
                    <th className="px-3 py-2">Durum</th>
                    <th className="px-3 py-2">Retry</th>
                    <th className="px-3 py-2">Olusturma</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden="true" />
                      </td>
                    </tr>
                  )}
                  {!loading && emails.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">E-posta yok.</td></tr>
                  )}
                  {!loading && emails.map(email => (
                    <tr key={email.id}>
                      <td className="px-3 py-3">
                        <div className="font-medium">{email.to_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">{email.to_email}</div>
                      </td>
                      <td className="max-w-sm px-3 py-3">
                        <div className="truncate font-medium">{email.subject}</div>
                        <div className="text-xs text-muted-foreground">{email.template_key || 'manual'}</div>
                        {email.last_error && <div className="mt-1 line-clamp-2 text-xs text-red-600">{email.last_error}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={email.status} />
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{email.retry_count}</td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(email.created_at)}</td>
                      <td className="px-3 py-3 text-right">
                        {email.status === 'failed' && (
                          <button type="button" onClick={() => void retry(email.id)} disabled={working} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted disabled:opacity-50">
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <section className="rounded-md border border-border bg-card p-4">
            <h2 className="text-base font-semibold">Test E-postasi</h2>
            <div className="mt-4 grid gap-3">
              <TextInput label="Alici" value={testEmail.to_email} onChange={value => setTestEmail(current => ({ ...current, to_email: value }))} />
              <TextInput label="Konu" value={testEmail.subject} onChange={value => setTestEmail(current => ({ ...current, subject: value }))} />
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Mesaj</span>
                <textarea value={testEmail.message} onChange={event => setTestEmail(current => ({ ...current, message: event.target.value }))} rows={5} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </label>
              <button type="button" onClick={sendTest} disabled={working} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                Kuyruga Al
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value, tone = 'blue' }: { label: string; value: number; tone?: 'blue' | 'emerald' | 'red' | 'amber' }) {
  const tones = {
    blue: 'bg-eden-blue/10 text-eden-blue',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    red: 'bg-red-500/10 text-red-700 dark:text-red-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  }
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn('mt-2 text-3xl font-semibold', tones[tone])}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: EmailMessageRecord['status'] }) {
  const classes = {
    queued: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200',
    sending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
    sent: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200',
    failed: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
    skipped: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200',
  }
  return <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', classes[status])}>{status}</span>
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
    </label>
  )
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Beklenmeyen hata olustu.'
}
