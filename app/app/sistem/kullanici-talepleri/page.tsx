'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, RefreshCw, UserPlus, XCircle } from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { tenantRequestHeaders } from '@/lib/tenancy/client'
import { cn } from '@/lib/utils'

type RegistrationRequest = {
  id: string
  company_id: string
  company_tax_number: string
  first_name: string
  last_name: string
  full_name?: string | null
  national_id: string
  email?: string | null
  phone?: string | null
  requested_role_key?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at?: string | null
  reviewed_at?: string | null
  notification_results?: Array<{ channel: string; status: string; detail?: string }>
  company?: {
    id: string
    trade_name?: string | null
    short_name?: string | null
    tax_number?: string | null
  } | null
}

type ToastState = { type: ToastType; title?: string; message: string }

export default function UserRegistrationRequestsPage() {
  return (
    <Suspense fallback={null}>
      <UserRegistrationRequestsContent />
    </Suspense>
  )
}

function UserRegistrationRequestsContent() {
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')
  const [requests, setRequests] = useState<RegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const selectedRequest = useMemo(
    () => selectedId ? requests.find(item => item.id === selectedId) || null : null,
    [requests, selectedId]
  )
  const pendingCount = requests.filter(item => item.status === 'pending').length

  async function loadRequests() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/user-registration-requests?status=all', {
        cache: 'no-store',
        headers: tenantRequestHeaders(),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Kullanıcı talepleri alınamadı.')
      setRequests(Array.isArray(payload.data) ? payload.data : [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Kullanıcı talepleri alınamadı.')
    } finally {
      setLoading(false)
    }
  }

  async function approveRequest(requestId: string) {
    setBusyId(requestId)
    setToast(null)
    try {
      const response = await fetch(`/api/user-registration-requests/${requestId}/approve`, {
        method: 'POST',
        headers: tenantRequestHeaders(),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Kullanıcı oluşturulamadı.')
      const warnings = notificationWarnings(payload.data?.notifications)
      setToast({
        type: warnings ? 'warning' : 'success',
        title: warnings ? 'Kullanıcı oluşturuldu' : 'Kullanıcı oluşturuldu',
        message: warnings || 'Talep onaylandı ve kullanıcı bilgilendirmesi tamamlandı.',
      })
      await loadRequests()
    } catch (approveError) {
      setToast({
        type: 'error',
        title: 'İşlem tamamlanamadı',
        message: approveError instanceof Error ? approveError.message : 'Kullanıcı oluşturulamadı.',
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="relative space-y-5">
      <PageBanner
        mode="list"
        title="Kullanıcı Kayıt Talepleri"
        subtitle="Kayıtlı şirkete katılmak isteyen kullanıcıları onaylayın."
        icon={<UserPlus size={24} />}
        addButtonText="Yenile"
        customButtonIcon={<RefreshCw size={16} />}
        onAddClick={loadRequests}
      />

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile label="Bekleyen Talep" value={pendingCount} tone="warning" />
        <SummaryTile label="Toplam Talep" value={requests.length} tone="info" />
        <SummaryTile label="Seçili Talep" value={selectedRequest ? 'Açık' : '-'} tone="neutral" />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-eden-navy-2 dark:text-gray-300">
          <Loader2 size={16} className="animate-spin" />
          Talepler yükleniyor
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-eden-navy-2 dark:text-gray-300">
          Kullanıcı kayıt talebi bulunmuyor.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            {requests.map(item => (
              <RequestRow
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                busy={busyId === item.id}
                onApprove={() => approveRequest(item.id)}
              />
            ))}
          </div>

          <aside className="h-fit rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-eden-navy-2">
            {selectedRequest ? (
              <RequestDetail item={selectedRequest} />
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-300">
                Bildirimden gelen talep burada öne çıkarılır.
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

function RequestRow({
  item,
  selected,
  busy,
  onApprove,
}: {
  item: RegistrationRequest
  selected: boolean
  busy: boolean
  onApprove: () => void
}) {
  const companyName = item.company?.short_name || item.company?.trade_name || 'Şirket'
  const fullName = item.full_name || [item.first_name, item.last_name].filter(Boolean).join(' ')
  const approved = item.status === 'approved'

  return (
    <div className={cn(
      'rounded-lg border bg-white p-4 shadow-sm dark:bg-eden-navy-2',
      selected ? 'border-eden-blue ring-2 ring-eden-blue/15 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'
    )}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white">{fullName}</h2>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-2 grid gap-1 text-sm text-gray-500 dark:text-gray-300 sm:grid-cols-2">
            <span>{companyName}</span>
            <span>VKN: {item.company_tax_number}</span>
            <span>TC: {maskNationalId(item.national_id)}</span>
            <span>{item.email || item.phone || '-'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onApprove}
          disabled={busy || item.status !== 'pending'}
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg bg-eden-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eden-blue-dk disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : approved ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
          {approved ? 'Oluşturuldu' : 'Kullanıcı Oluştur'}
        </button>
      </div>
    </div>
  )
}

function RequestDetail({ item }: { item: RegistrationRequest }) {
  const fullName = item.full_name || [item.first_name, item.last_name].filter(Boolean).join(' ')
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <UserPlus size={16} />
        Talep Detayı
      </div>
      <div className="space-y-3 text-sm">
        <DetailLine label="Ad Soyad" value={fullName} />
        <DetailLine label="Şirket" value={item.company?.short_name || item.company?.trade_name || '-'} />
        <DetailLine label="VKN" value={item.company_tax_number} />
        <DetailLine label="TC Kimlik" value={maskNationalId(item.national_id)} />
        <DetailLine label="E-posta" value={item.email || '-'} />
        <DetailLine label="Telefon" value={item.phone || '-'} />
        <DetailLine label="Talep Tarihi" value={formatDate(item.created_at)} />
        <DetailLine label="Durum" value={statusLabel(item.status)} />
      </div>
      {Array.isArray(item.notification_results) && item.notification_results.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50">
          <div className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Bilgilendirme</div>
          <div className="space-y-1">
            {item.notification_results.map((result, index) => (
              <div key={`${result.channel}-${index}`} className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span>{result.channel}</span>
                <span>{result.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryTile({ label, value, tone }: { label: string; value: string | number; tone: 'warning' | 'info' | 'neutral' }) {
  const toneClass = {
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
    info: 'bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200',
    neutral: 'bg-gray-50 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200',
  }[tone]
  return (
    <div className={cn('rounded-lg border border-gray-200 p-4 dark:border-gray-700', toneClass)}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  )
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: RegistrationRequest['status'] }) {
  const approved = status === 'approved'
  const pending = status === 'pending'
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
      approved && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200',
      pending && 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200',
      !approved && !pending && 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300'
    )}>
      {approved ? <CheckCircle2 size={12} /> : pending ? <UserPlus size={12} /> : <XCircle size={12} />}
      {statusLabel(status)}
    </span>
  )
}

function statusLabel(status: RegistrationRequest['status']) {
  if (status === 'pending') return 'Onay Bekliyor'
  if (status === 'approved') return 'Onaylandı'
  if (status === 'rejected') return 'Reddedildi'
  return 'İptal'
}

function maskNationalId(value?: string | null) {
  const digits = String(value || '')
  if (digits.length < 6) return digits || '-'
  return `${digits.slice(0, 3)}*****${digits.slice(-3)}`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function notificationWarnings(results: unknown) {
  if (!Array.isArray(results)) return ''
  const failedOrSkipped = results
    .filter((item: any) => item?.status !== 'sent')
    .map((item: any) => `${item.channel}: ${item.detail || item.status}`)
  return failedOrSkipped.length ? `Kullanıcı oluşturuldu; bazı bildirimler tamamlanamadı. ${failedOrSkipped.join(', ')}` : ''
}
