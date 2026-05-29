'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  Home,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  User,
  Wrench,
} from 'lucide-react'
import {
  portalDocuments,
  portalNotifications,
  portalProducts,
  portalServiceRecords,
  portalServiceRequests,
  portalSession,
  type PortalDashboard,
  type PortalDocument,
  type PortalMe,
  type PortalProduct,
  type PortalServiceRecord,
  type PortalServiceRequest,
  type PortalServiceRequestCreate,
} from '@/lib/services/portal'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/portal/dashboard', label: 'Ana Sayfa', icon: Home },
  { href: '/portal/products', label: 'Urunlerim', icon: Package },
  { href: '/portal/service-requests', label: 'Servis Taleplerim', icon: Wrench },
  { href: '/portal/service-records', label: 'Servis Kayitlari', icon: CheckCircle2 },
  { href: '/portal/documents', label: 'Belgeler', icon: FileText },
  { href: '/portal/profile', label: 'Profil', icon: User },
]

type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export function PortalLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [me, setMe] = useState<PortalMe | null>(null)

  useEffect(() => {
    let cancelled = false
    portalSession.me()
      .then(value => {
        if (!cancelled) setMe(value)
      })
      .catch(() => {
        if (!cancelled) setMe(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const customerName = String(me?.stakeholder?.display_name || 'Musteri Portali')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/portal/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{customerName}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Self-service destek portali</span>
            </span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto pb-1 lg:pb-0" aria-label="Portal">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
                    active && 'bg-slate-900 text-white hover:bg-slate-900 hover:text-white dark:bg-white dark:text-slate-950 dark:hover:bg-white dark:hover:text-slate-950'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}

export function PortalDashboardPage() {
  const dashboard = usePortalAsync(() => portalSession.dashboard())

  return (
    <PageFrame title="Portal Dashboard" description="Size ait urun, servis ve bildirimlerin ozeti.">
      <AsyncBlock state={dashboard} emptyLabel="Portal verisi bulunamadi.">
        {data => <DashboardContent data={data} />}
      </AsyncBlock>
    </PageFrame>
  )
}

function DashboardContent({ data }: { data: PortalDashboard }) {
  const counters = [
    { label: 'Kurulu urun', value: data.asset_count, icon: Package },
    { label: 'Acik servis talebi', value: data.open_service_request_count, icon: Wrench },
    { label: 'Yaklasan bakim', value: data.maintenance_due_count, icon: CalendarClock },
    { label: 'Bekleyen aksiyon', value: data.pending_action_count, icon: Bell },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {counters.map(item => {
          const Icon = item.icon
          return (
            <section key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">{item.label}</span>
                <Icon className="h-5 w-5 text-slate-500" aria-hidden="true" />
              </div>
              <div className="mt-3 text-2xl font-semibold">{item.value}</div>
            </section>
          )
        })}
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <SectionHeader title="Son servis kayitlari" actionHref="/portal/service-records" actionLabel="Tumunu ac" />
        <RecordList records={data.recent_service_records || []} />
      </section>
    </div>
  )
}

export function PortalProductsPage() {
  const products = usePortalAsync(() => portalProducts.list())

  return (
    <PageFrame title="Urunlerim" description="Size atanmis kurulu urunler, garanti ve servis durumu.">
      <AsyncBlock state={products} emptyLabel="Henuz kayitli urununuz bulunmuyor.">
        {payload => (
          <div className="grid gap-3 lg:grid-cols-2">
            {payload.data.map(product => (
              <ProductSummary key={product.id} product={product} />
            ))}
          </div>
        )}
      </AsyncBlock>
    </PageFrame>
  )
}

export function PortalProductDetailPage({ productId }: { productId: string }) {
  const product = usePortalAsync(() => portalProducts.get(productId), productId)

  return (
    <PageFrame title="Urun Detayi" description="Garanti, lokasyon ve servis gecmisi.">
      <AsyncBlock state={product} emptyLabel="Urun bulunamadi.">
        {data => (
          <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{data.product_name || 'Urun'}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data.serial_no || data.asset_tag || 'Seri numarasi yok'}</p>
                </div>
                <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white dark:bg-white dark:text-slate-950" href={`/portal/service-requests?assetId=${data.id}`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Servis Talebi
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Garanti" value={friendlyWarranty(data.warranty_status)} />
                <Info label="Garanti Bitis" value={formatDate(data.warranty_end_date)} />
                <Info label="Son Servis" value={formatDate(data.last_service_date)} />
                <Info label="Sonraki Bakim" value={formatDate(data.next_maintenance_date)} />
              </div>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <SectionHeader title="Servis gecmisi" />
              <RecordList records={data.service_history || []} />
            </section>
          </div>
        )}
      </AsyncBlock>
    </PageFrame>
  )
}

export function PortalServiceRequestsPage() {
  const [refresh, setRefresh] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const requests = usePortalAsync(() => portalServiceRequests.list(), refresh)
  const products = usePortalAsync(() => portalProducts.list({ pageSize: 100 }), refresh)

  async function handleCreate(input: PortalServiceRequestCreate) {
    setCreating(true)
    setMessage(null)
    try {
      await portalServiceRequests.create(input)
      setMessage('Servis talebiniz alindi.')
      setRefresh(value => value + 1)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Servis talebi olusturulamadi.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <PageFrame title="Servis Taleplerim" description="Yeni servis talebi acin ve mevcut taleplerinizin durumunu izleyin.">
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <ServiceRequestForm products={products.data?.data || []} creating={creating} message={message} onCreate={handleCreate} />
        <AsyncBlock state={requests} emptyLabel="Acik servis talebiniz yok.">
          {payload => (
            <div className="space-y-3">
              {payload.data.map(request => (
                <RequestSummary key={request.id} request={request} />
              ))}
            </div>
          )}
        </AsyncBlock>
      </div>
    </PageFrame>
  )
}

export function PortalServiceRequestDetailPage({ requestId }: { requestId: string }) {
  const request = usePortalAsync(() => portalServiceRequests.get(requestId), requestId)

  return (
    <PageFrame title="Servis Talebi" description="Talep ozeti, durum ve servis kayitlari.">
      <AsyncBlock state={request} emptyLabel="Servis talebi bulunamadi.">
        {data => (
          <div className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{data.subject}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data.request_no}</p>
                </div>
                <StatusBadge value={data.portal_status || data.status} />
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{data.description || 'Aciklama girilmemis.'}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Oncelik" value={friendlyPriority(data.priority)} />
                <Info label="Talep Tipi" value={friendlyRequestType(data.request_type)} />
                <Info label="Istenen Tarih" value={formatDate(data.requested_date)} />
                <Info label="Plan Tarihi" value={formatDate(data.schedule_date)} />
              </div>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <SectionHeader title="Bagli servis kayitlari" />
              <RecordList records={data.service_records || []} />
            </section>
          </div>
        )}
      </AsyncBlock>
    </PageFrame>
  )
}

export function PortalServiceRecordsPage() {
  const records = usePortalAsync(() => portalServiceRecords.list())

  return (
    <PageFrame title="Servis Kayitlari" description="Tamamlanan veya devam eden servis islerinin musteriye acik ozeti.">
      <AsyncBlock state={records} emptyLabel="Servis kaydi bulunmuyor.">
        {payload => <RecordList records={payload.data} />}
      </AsyncBlock>
    </PageFrame>
  )
}

export function PortalDocumentsPage() {
  const [refresh, setRefresh] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const documents = usePortalAsync(() => portalDocuments.list(), refresh)

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setUploading(true)
    const form = new FormData(event.currentTarget)
    try {
      await portalDocuments.upload({
        title: String(form.get('title') || ''),
        file_name: String(form.get('file_name') || ''),
        document_type: String(form.get('document_type') || 'customer_upload'),
        mime_type: String(form.get('mime_type') || 'application/octet-stream'),
      })
      event.currentTarget.reset()
      setMessage('Belge metadata kaydi olusturuldu.')
      setRefresh(value => value + 1)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Belge yuklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <PageFrame title="Belgeler" description="Size paylasilan servis raporlari ve musteri tarafindan yuklenen belgeler.">
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <form onSubmit={upload} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-semibold">Belge Ekle</h2>
          <TextInput name="title" label="Baslik" required />
          <TextInput name="file_name" label="Dosya adi" required />
          <TextInput name="document_type" label="Belge tipi" defaultValue="customer_upload" />
          <TextInput name="mime_type" label="MIME tipi" defaultValue="application/octet-stream" />
          {message ? <InlineNotice text={message} /> : null}
          <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950" disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            Belge Kaydet
          </button>
        </form>
        <AsyncBlock state={documents} emptyLabel="Paylasilmis belge bulunmuyor.">
          {payload => (
            <div className="space-y-3">
              {payload.data.map(document => <DocumentSummary key={document.id} document={document} />)}
            </div>
          )}
        </AsyncBlock>
      </div>
    </PageFrame>
  )
}

export function PortalProfilePage() {
  const me = usePortalAsync(() => portalSession.me())
  const notifications = usePortalAsync(() => portalNotifications.list())

  return (
    <PageFrame title="Profil" description="Portal rolunuz, erisim kapsaminiz ve son bildirimler.">
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <AsyncBlock state={me} emptyLabel="Portal kullanicisi bulunamadi.">
          {data => (
            <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold">{String(data.stakeholder?.display_name || 'Musteri')}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Portal rol" value={friendlyRole(data.portal_role)} />
                <Info label="Durum" value={data.status} />
                <Info label="Paydas" value={data.stakeholder_id} />
                <Info label="Cari/Musteri kapsami" value={data.customer_account_id || '-'} />
              </div>
            </section>
          )}
        </AsyncBlock>
        <AsyncBlock state={notifications} emptyLabel="Bildirim bulunmuyor.">
          {items => (
            <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <SectionHeader title="Bildirimler" />
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="text-sm font-medium">{item.title || 'Bildirim'}</div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.message || '-'}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </AsyncBlock>
      </div>
    </PageFrame>
  )
}

function ProductSummary({ product }: { product: PortalProduct }) {
  return (
    <Link href={`/portal/products/${product.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{product.product_name || 'Urun'}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{product.serial_no || product.asset_tag || 'Seri numarasi yok'}</p>
        </div>
        <StatusBadge value={friendlyWarranty(product.warranty_status)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Son Servis" value={formatDate(product.last_service_date)} />
        <Info label="Sonraki Bakim" value={formatDate(product.next_maintenance_date)} />
      </div>
    </Link>
  )
}

function RequestSummary({ request }: { request: PortalServiceRequest }) {
  return (
    <Link href={`/portal/service-requests/${request.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{request.request_no}</div>
          <h2 className="mt-1 truncate text-base font-semibold">{request.subject || 'Servis talebi'}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{request.asset_product_name || request.customer_name || '-'}</p>
        </div>
        <StatusBadge value={request.portal_status || request.status} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Info label="Oncelik" value={friendlyPriority(request.priority)} />
        <Info label="Talep Tipi" value={friendlyRequestType(request.request_type)} />
        <Info label="Plan" value={formatDate(request.schedule_date || request.requested_date)} />
      </div>
    </Link>
  )
}

function ServiceRequestForm({ products, creating, message, onCreate }: { products: PortalProduct[]; creating: boolean; message: string | null; onCreate: (input: PortalServiceRequestCreate) => Promise<void> }) {
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onCreate({
      installed_asset_id: String(form.get('installed_asset_id') || '') || null,
      request_type: String(form.get('request_type') || 'fault'),
      priority: String(form.get('priority') || 'medium'),
      subject: String(form.get('subject') || ''),
      description: String(form.get('description') || ''),
      contact_person: String(form.get('contact_person') || ''),
      contact_phone: String(form.get('contact_phone') || ''),
      contact_email: String(form.get('contact_email') || ''),
      requested_date: String(form.get('requested_date') || '') || null,
    })
    event.currentTarget.reset()
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold">Yeni Talep</h2>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600 dark:text-slate-300">Urun</span>
        <select name="installed_asset_id" className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
          <option value="">Urun secmeden devam et</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>{product.product_name || 'Urun'} - {product.serial_no || product.asset_tag || product.id}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectInput name="request_type" label="Talep tipi" options={[['fault', 'Ariza'], ['maintenance', 'Bakim'], ['warranty', 'Garanti'], ['other', 'Diger']]} />
        <SelectInput name="priority" label="Oncelik" options={[['medium', 'Normal'], ['high', 'Yuksek'], ['urgent', 'Acil'], ['low', 'Dusuk']]} />
      </div>
      <TextInput name="subject" label="Konu" required />
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600 dark:text-slate-300">Aciklama</span>
        <textarea name="description" rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput name="contact_person" label="Iletisim kisisi" />
        <TextInput name="contact_phone" label="Telefon" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput name="contact_email" label="E-posta" />
        <TextInput name="requested_date" label="Uygun tarih" type="date" />
      </div>
      {message ? <InlineNotice text={message} /> : null}
      <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-950" disabled={creating}>
        {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        Talep Olustur
      </button>
    </form>
  )
}

function RecordList({ records }: { records: PortalServiceRecord[] }) {
  if (!records.length) return <EmptyState label="Servis kaydi bulunmuyor." />
  return (
    <div className="space-y-3">
      {records.map((record, index) => (
        <div key={record.id || record.service_no || index} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold">{record.service_no || record.service_type || 'Servis'}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(record.service_date)} · {record.service_type || '-'}</div>
            </div>
            <StatusBadge value={record.result || record.status} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{record.work_performed || 'Islem ozeti henuz paylasilmadi.'}</p>
        </div>
      ))}
    </div>
  )
}

function DocumentSummary({ document }: { document: PortalDocument }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{document.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{document.file_name || document.document_type || '-'}</p>
        </div>
        <StatusBadge value={document.status || 'paylasildi'} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Info label="Tip" value={document.document_type || '-'} />
        <Info label="Tarih" value={formatDate(document.issue_date || document.created_at)} />
        <Info label="Gecerlilik" value={formatDate(document.expiry_date)} />
      </div>
    </div>
  )
}

function PageFrame({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function AsyncBlock<T>({ state, emptyLabel, children }: { state: AsyncState<T>; emptyLabel: string; children: (data: T) => React.ReactNode }) {
  if (state.loading) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" aria-hidden="true" />
      </div>
    )
  }
  if (state.error) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      </div>
    )
  }
  if (!state.data || (Array.isArray(state.data) && state.data.length === 0)) return <EmptyState label={emptyLabel} />
  return <>{children(state.data)}</>
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      {label}
    </div>
  )
}

function SectionHeader({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {actionHref && actionLabel ? (
        <Link className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium dark:border-slate-700" href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
      <div className="text-xs uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value || '-'}</div>
    </div>
  )
}

function StatusBadge({ value }: { value?: string | null }) {
  return (
    <span className="inline-flex min-h-7 shrink-0 items-center rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
      {friendlyStatus(value)}
    </span>
  )
}

function TextInput({ label, name, type = 'text', required = false, defaultValue }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600 dark:text-slate-300">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
    </label>
  )
}

function SelectInput({ label, name, options }: { label: string; name: string; options: [string, string][] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600 dark:text-slate-300">{label}</span>
      <select name={name} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
        {options.map(([value, labelText]) => <option key={value} value={value}>{labelText}</option>)}
      </select>
    </label>
  )
}

function InlineNotice({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
      {text}
    </div>
  )
}

function usePortalAsync<T>(loader: () => Promise<T>, dependencyKey: string | number = 'initial'): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  }, [loader])

  useEffect(() => {
    let cancelled = false
    setState(current => ({ ...current, loading: true, error: null }))
    loaderRef.current()
      .then(data => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch(error => {
        if (!cancelled) setState({ data: null, loading: false, error: error instanceof Error ? error.message : 'Portal verisi yuklenemedi.' })
      })
    return () => {
      cancelled = true
    }
  }, [dependencyKey])

  return state
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function friendlyWarranty(value?: string | null) {
  return ({ in_warranty: 'Garanti kapsaminda', out_of_warranty: 'Garanti disi', unknown: 'Bilinmiyor', void: 'Garanti gecersiz' } as Record<string, string>)[String(value || '')] || value || '-'
}

function friendlyPriority(value?: string | null) {
  return ({ urgent: 'Acil', high: 'Yuksek', medium: 'Normal', low: 'Dusuk' } as Record<string, string>)[String(value || '')] || value || '-'
}

function friendlyRequestType(value?: string | null) {
  return ({ fault: 'Ariza', maintenance: 'Bakim', installation: 'Kurulum', training: 'Egitim', inspection: 'Kontrol', warranty: 'Garanti', upgrade: 'Yukseltme', other: 'Diger' } as Record<string, string>)[String(value || '')] || value || '-'
}

function friendlyRole(value?: string | null) {
  return ({ customer_admin: 'Musteri Yoneticisi', customer_user: 'Musteri Kullanicisi', customer_viewer: 'Goruntuleyici', service_contact: 'Servis Iletisimi' } as Record<string, string>)[String(value || '')] || value || '-'
}

function friendlyStatus(value?: string | null) {
  return ({
    alindi: 'Alindi',
    inceleniyor: 'Inceleniyor',
    atandi: 'Atandi',
    planlandi: 'Planlandi',
    islemde: 'Islemde',
    musteri_bekleniyor: 'Musteri Bekleniyor',
    parca_bekleniyor: 'Parca Bekleniyor',
    cozuldu: 'Cozuldu',
    kapandi: 'Kapandi',
    iptal_edildi: 'Iptal Edildi',
    completed: 'Tamamlandi',
    resolved: 'Cozuldu',
    closed: 'Kapandi',
  } as Record<string, string>)[String(value || '')] || value || '-'
}
