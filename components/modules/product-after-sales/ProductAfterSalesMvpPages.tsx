'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, Headphones, PackageCheck, Plus, RefreshCw, Tags, Wrench } from 'lucide-react'
import { PageBanner } from '@/components/ui/PageBanner'
import { createProduct, getProductsSummary, listProducts, type ProductCatalogRecord, type ProductSummary } from '@/lib/services/product-services'
import { afterSalesAssets, afterSalesRecords, afterSalesRequests, listMaintenanceDue, type InstalledAssetRecord, type ServiceRecordRecord, type ServiceRequestRecord } from '@/lib/services/after-sales'

const defaultProductSummary: ProductSummary = { total_products: 0, active_products: 0, after_sales_enabled: 0, maintenance_required: 0, by_type: {} }

export function ProductServicesHomeMvpPage() {
  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="Urun ve Hizmetler" subtitle="Satilabilir ve servis verilebilir urun/hizmet katalogu." icon={<Tags size={24} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <NavTile href="/app/urun-ve-hizmetler/katalog" icon={<Tags size={20} />} title="Urun/Hizmet Katalogu" text="Seri no, garanti, bakim ve satis sonrasi secilebilirlik burada tanimlanir." />
        <NavTile href="/app/satis-sonrasi/kurulu-urunler" icon={<PackageCheck size={20} />} title="Kurulu Urunler" text="Musterideki gercek varlik, lokasyon, garanti ve servis gecmisi." />
        <NavTile href="/app/satis-sonrasi/servis-talepleri" icon={<Headphones size={20} />} title="Servis Talepleri" text="Musteri talebi, atama ve project task entegrasyonu." />
      </div>
      <InfoPanel>
        Urun katalogu satilabilir/hizmet verilebilir urunun tanimidir. Kurulu urun ise belirli bir musteride, belirli lokasyonda, belirli seri numarasiyla izlenen gercek varliktir.
      </InfoPanel>
    </div>
  )
}

export function AfterSalesHomeMvpPage() {
  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="Satis Sonrasi" subtitle="Kurulum, garanti, bakim, servis talebi ve servis kaydi omurgasi." icon={<Headphones size={24} />} />
      <div className="grid gap-4 lg:grid-cols-4">
        <NavTile href="/app/satis-sonrasi/kurulu-urunler" icon={<PackageCheck size={20} />} title="Kurulu Urunler" text="Musteri envanteri ve garanti takibi." />
        <NavTile href="/app/satis-sonrasi/servis-talepleri" icon={<Headphones size={20} />} title="Servis Talepleri" text="Ariza, bakim, kurulum ve destek talepleri." />
        <NavTile href="/app/satis-sonrasi/servis-kayitlari" icon={<Wrench size={20} />} title="Servis Kayitlari" text="Saha ziyareti, mudahale ve rapor." />
        <NavTile href="/app/satis-sonrasi/bakimi-gelenler" icon={<AlertTriangle size={20} />} title="Bakimi Gelenler" text="Yaklasan veya gecmis bakim kayitlari." />
      </div>
      <InfoPanel>
        Project task servis talebinin yerine gecmez; takip isini Action Center icine tasir. Servis talebi ve servis kaydi kendi domain lifecycle ile kalir.
      </InfoPanel>
    </div>
  )
}

export function ProductCatalogMvpPage() {
  const [rows, setRows] = useState<ProductCatalogRecord[]>([])
  const [summary, setSummary] = useState<ProductSummary>(defaultProductSummary)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ product_name: '', product_type: 'physical_product', category: '', brand: '', model: '', serial_required: true, warranty_months: 24, maintenance_required: true, maintenance_period_days: 180, after_sales_enabled: true })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [list, nextSummary] = await Promise.all([listProducts({ pageSize: 100 }), getProductsSummary()])
      setRows(list.data)
      setSummary(nextSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Katalog yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function submit() {
    await createProduct({
      ...form,
      product_code: undefined,
      product_name: form.product_name || 'PlaneGuard',
      warranty_months: Number(form.warranty_months || 0),
      maintenance_period_days: Number(form.maintenance_period_days || 0),
      serviceable: true,
      active: true,
      sale_enabled: true,
      default_currency: 'TRY',
    })
    setForm(current => ({ ...current, product_name: '' }))
    await load()
  }

  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="Urun/Hizmet Katalogu" subtitle="Servis verilebilir urun ve hizmet tanimlari." icon={<Tags size={24} />} />
      <SummaryGrid items={[
        ['Toplam', summary.total_products],
        ['Aktif', summary.active_products],
        ['Satis sonrasi', summary.after_sales_enabled],
        ['Bakim gerekli', summary.maintenance_required],
      ]} />
      <FormPanel title="Hizli katalog kaydi" onSubmit={submit}>
        <Input label="Ad" value={form.product_name} onChange={value => setForm({ ...form, product_name: value })} placeholder="PlaneGuard" />
        <Select label="Tur" value={form.product_type} onChange={value => setForm({ ...form, product_type: value })} options={['physical_product', 'software', 'service', 'subscription', 'spare_part']} />
        <Input label="Kategori" value={form.category} onChange={value => setForm({ ...form, category: value })} />
        <Input label="Marka" value={form.brand} onChange={value => setForm({ ...form, brand: value })} />
        <Input label="Model" value={form.model} onChange={value => setForm({ ...form, model: value })} />
        <Input label="Garanti ay" value={String(form.warranty_months)} onChange={value => setForm({ ...form, warranty_months: Number(value) })} />
        <Toggle label="Seri no zorunlu" checked={form.serial_required} onChange={value => setForm({ ...form, serial_required: value })} />
        <Toggle label="Satis sonrasi etkin" checked={form.after_sales_enabled} onChange={value => setForm({ ...form, after_sales_enabled: value })} />
      </FormPanel>
      <DataState loading={loading} error={error} onRetry={load} />
      <Table headers={['Kod', 'Ad', 'Tur', 'Marka/Model', 'Seri', 'Garanti', 'Bakim', 'Satis sonrasi', 'Aktif']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell mono>{row.product_code}</Cell>
            <Cell>{row.product_name}</Cell>
            <Cell><Badge>{row.product_type}</Badge></Cell>
            <Cell>{[row.brand, row.model].filter(Boolean).join(' / ') || '-'}</Cell>
            <Cell>{row.serial_required ? 'Zorunlu' : '-'}</Cell>
            <Cell>{row.warranty_months ? `${row.warranty_months} ay` : '-'}</Cell>
            <Cell>{row.maintenance_required ? `${row.maintenance_period_days || '-'} gun` : '-'}</Cell>
            <Cell>{row.after_sales_enabled ? <Badge tone="green">Etkin</Badge> : '-'}</Cell>
            <Cell>{row.active ? <Badge tone="green">Aktif</Badge> : <Badge tone="red">Pasif</Badge>}</Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function InstalledAssetsMvpPage() {
  const [rows, setRows] = useState<InstalledAssetRecord[]>([])
  const [products, setProducts] = useState<ProductCatalogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ owning_company_id: '', customer_name: '', product_id: '', serial_no: '', installation_date: '', next_maintenance_date: '' })
  const serviceableProducts = products.filter(item => item.after_sales_enabled)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [assets, productList] = await Promise.all([afterSalesAssets.list({ pageSize: 100 }), listProducts({ after_sales_enabled: true, pageSize: 100 })])
      setRows(assets.data)
      setProducts(productList.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kurulu urunler yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function submit() {
    await afterSalesAssets.create({
      ...form,
      owning_company_id: form.owning_company_id,
      customer_name: form.customer_name || 'Demo Musteri',
      product_id: form.product_id || serviceableProducts[0]?.id,
      installation_date: form.installation_date || undefined,
      warranty_start_date: form.installation_date || undefined,
      next_maintenance_date: form.next_maintenance_date || undefined,
      status: 'active',
    })
    await load()
  }

  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="Kurulu Urunler" subtitle="Musteri, lokasyon, seri no, garanti ve bakim takibi." icon={<PackageCheck size={24} />} />
      <FormPanel title="Kurulu urun olustur" onSubmit={submit}>
        <Input label="Sirket ID" value={form.owning_company_id} onChange={value => setForm({ ...form, owning_company_id: value })} />
        <Input label="Musteri" value={form.customer_name} onChange={value => setForm({ ...form, customer_name: value })} />
        <Select label="Urun" value={form.product_id} onChange={value => setForm({ ...form, product_id: value })} options={serviceableProducts.map(item => item.id)} labels={Object.fromEntries(serviceableProducts.map(item => [item.id, `${item.product_code} - ${item.product_name}`]))} />
        <Input label="Seri no" value={form.serial_no} onChange={value => setForm({ ...form, serial_no: value })} />
        <Input label="Kurulum tarihi" value={form.installation_date} onChange={value => setForm({ ...form, installation_date: value })} placeholder="2026-05-28" />
        <Input label="Sonraki bakim" value={form.next_maintenance_date} onChange={value => setForm({ ...form, next_maintenance_date: value })} placeholder="2026-11-28" />
      </FormPanel>
      <DataState loading={loading} error={error} onRetry={load} />
      <Table headers={['Durum', 'Musteri', 'Urun', 'Seri no', 'Garanti', 'Garanti bitis', 'Son servis', 'Bakim', 'Servis']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell><Badge tone={row.status === 'active' ? 'green' : 'gray'}>{row.status}</Badge></Cell>
            <Cell>{row.customer_name}</Cell>
            <Cell>{row.product_name}</Cell>
            <Cell mono>{row.serial_no || '-'}</Cell>
            <Cell><WarrantyBadge value={row.warranty_status} /></Cell>
            <Cell>{formatDate(row.warranty_end_date)}</Cell>
            <Cell>{formatDate(row.last_service_date)}</Cell>
            <Cell>{formatDate(row.next_maintenance_date)}</Cell>
            <Cell>{row.service_count || 0}</Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function ServiceRequestsMvpPage() {
  const [rows, setRows] = useState<ServiceRequestRecord[]>([])
  const [assets, setAssets] = useState<InstalledAssetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ company_id: '', customer_name: '', installed_asset_id: '', subject: '', priority: 'high', assigned_user_id: '', create_project_task: true })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [requests, assetList] = await Promise.all([afterSalesRequests.list({ pageSize: 100 }), afterSalesAssets.list({ pageSize: 100 })])
      setRows(requests.data)
      setAssets(assetList.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Servis talepleri yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function submit() {
    await afterSalesRequests.create({
      ...form,
      company_id: form.company_id,
      customer_name: form.customer_name || 'Demo Musteri',
      installed_asset_id: form.installed_asset_id || undefined,
      subject: form.subject || 'PlaneGuard ariza talebi',
      request_type: 'fault',
      source: 'internal',
      assigned_user_id: form.assigned_user_id || undefined,
      create_project_task: form.create_project_task,
    })
    await load()
  }

  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="Servis Talepleri" subtitle="Ariza, bakim, kurulum ve garanti talepleri." icon={<Headphones size={24} />} />
      <FormPanel title="Servis talebi olustur" onSubmit={submit}>
        <Input label="Sirket ID" value={form.company_id} onChange={value => setForm({ ...form, company_id: value })} />
        <Input label="Musteri" value={form.customer_name} onChange={value => setForm({ ...form, customer_name: value })} />
        <Select label="Kurulu urun" value={form.installed_asset_id} onChange={value => setForm({ ...form, installed_asset_id: value })} options={assets.map(item => item.id)} labels={Object.fromEntries(assets.map(item => [item.id, `${item.customer_name} - ${item.product_name}`]))} />
        <Input label="Konu" value={form.subject} onChange={value => setForm({ ...form, subject: value })} />
        <Select label="Oncelik" value={form.priority} onChange={value => setForm({ ...form, priority: value })} options={['low', 'medium', 'high', 'urgent']} />
        <Input label="Atanan user" value={form.assigned_user_id} onChange={value => setForm({ ...form, assigned_user_id: value })} />
        <Toggle label="Project task olustur" checked={form.create_project_task} onChange={value => setForm({ ...form, create_project_task: value })} />
      </FormPanel>
      <DataState loading={loading} error={error} onRetry={load} />
      <Table headers={['Talep', 'Durum', 'Oncelik', 'Musteri', 'Konu', 'Son tarih', 'Atanan', 'Task']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell mono>{row.request_no}</Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell><PriorityBadge value={row.priority} /></Cell>
            <Cell>{row.customer_name}</Cell>
            <Cell>{row.subject}</Cell>
            <Cell>{formatDate(row.due_date)}</Cell>
            <Cell>{row.assigned_user_id || row.assigned_employee_id || '-'}</Cell>
            <Cell>{row.project_task_id ? <Badge tone="blue">Bagli</Badge> : '-'}</Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function ServiceRecordsMvpPage() {
  const [rows, setRows] = useState<ServiceRecordRecord[]>([])
  const [requests, setRequests] = useState<ServiceRequestRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ company_id: '', service_request_id: '', service_type: 'repair', service_date: '', technician_user_id: '', fault_description: '' })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [records, requestList] = await Promise.all([afterSalesRecords.list({ pageSize: 100 }), afterSalesRequests.list({ pageSize: 100 })])
      setRows(records.data)
      setRequests(requestList.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Servis kayitlari yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function submit() {
    const selectedRequest = requests.find(item => item.id === form.service_request_id)
    await afterSalesRecords.create({
      ...form,
      company_id: form.company_id || selectedRequest?.company_id,
      service_request_id: form.service_request_id || undefined,
      installed_asset_id: selectedRequest?.installed_asset_id,
      product_id: selectedRequest?.product_id,
      service_date: form.service_date || new Date().toISOString().slice(0, 10),
      technician_user_id: form.technician_user_id || undefined,
      status: 'planned',
    })
    await load()
  }

  async function complete(id: string) {
    await afterSalesRecords.complete(id, { result: 'resolved', work_performed: 'Mudahale tamamlandi.', warranty_covered: true })
    await load()
  }

  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="Servis Kayitlari" subtitle="Saha ziyareti, uzaktan destek, bakim ve onarim sonuclari." icon={<Wrench size={24} />} />
      <FormPanel title="Servis kaydi olustur" onSubmit={submit}>
        <Input label="Sirket ID" value={form.company_id} onChange={value => setForm({ ...form, company_id: value })} />
        <Select label="Talep" value={form.service_request_id} onChange={value => setForm({ ...form, service_request_id: value })} options={requests.map(item => item.id)} labels={Object.fromEntries(requests.map(item => [item.id, `${item.request_no} - ${item.subject}`]))} />
        <Select label="Servis turu" value={form.service_type} onChange={value => setForm({ ...form, service_type: value })} options={['installation', 'repair', 'maintenance', 'inspection', 'remote_support', 'training']} />
        <Input label="Tarih" value={form.service_date} onChange={value => setForm({ ...form, service_date: value })} placeholder="2026-05-28" />
        <Input label="Teknisyen user" value={form.technician_user_id} onChange={value => setForm({ ...form, technician_user_id: value })} />
        <Input label="Ariza" value={form.fault_description} onChange={value => setForm({ ...form, fault_description: value })} />
      </FormPanel>
      <DataState loading={loading} error={error} onRetry={load} />
      <Table headers={['Servis', 'Durum', 'Tur', 'Tarih', 'Teknisyen', 'Sonuc', 'Garanti', 'Sonraki aksiyon', '']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell mono>{row.service_no}</Cell>
            <Cell><StatusBadge value={row.status} /></Cell>
            <Cell>{row.service_type}</Cell>
            <Cell>{formatDate(row.service_date)}</Cell>
            <Cell>{row.technician_user_id || row.technician_employee_id || '-'}</Cell>
            <Cell>{row.result || '-'}</Cell>
            <Cell>{row.warranty_covered === true ? 'Evet' : row.warranty_covered === false ? 'Hayir' : '-'}</Cell>
            <Cell>{row.next_action || '-'}</Cell>
            <Cell>{row.status !== 'completed' && <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white" onClick={() => void complete(row.id)}>Tamamla</button>}</Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function MaintenanceDueMvpPage() {
  const [rows, setRows] = useState<InstalledAssetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRows(await listMaintenanceDue({ limit: 200 }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bakim listesi yuklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="space-y-6">
      <PageBanner mode="list" title="Bakimi Gelenler" subtitle="Bakim tarihi gelen veya gecen kurulu urunler." icon={<AlertTriangle size={24} />} />
      <DataState loading={loading} error={error} onRetry={load} />
      <Table headers={['Musteri', 'Urun', 'Seri no', 'Sonraki bakim', 'Garanti', 'Durum']}>
        {rows.map(row => (
          <tr key={row.id}>
            <Cell>{row.customer_name}</Cell>
            <Cell>{row.product_name}</Cell>
            <Cell mono>{row.serial_no || '-'}</Cell>
            <Cell>{formatDate(row.next_maintenance_date)}</Cell>
            <Cell><WarrantyBadge value={row.warranty_status} /></Cell>
            <Cell><Badge>{row.status}</Badge></Cell>
          </tr>
        ))}
      </Table>
    </div>
  )
}

function NavTile({ href, icon, title, text }: { href: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-eden-blue hover:shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-eden-blue dark:bg-blue-950/40">{icon}</div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{text}</p>
        </div>
      </div>
    </Link>
  )
}

function SummaryGrid({ items }: { items: [string, number][] }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map(([label, value]) => <div key={label} className="rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><div className="text-xs text-gray-500">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>)}
    </div>
  )
}

function FormPanel({ title, children, onSubmit }: { title: string; children: ReactNode; onSubmit: () => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        <button className="inline-flex items-center gap-2 rounded-md bg-eden-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => { setSaving(true); void onSubmit().finally(() => setSaving(false)) }}>
          <Plus size={16} /> Kaydet
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>
    </section>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}<input className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950" value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}<select className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-950" value={value} onChange={event => onChange(event.target.value)}><option value="">Sec</option>{options.map(option => <option key={option} value={option}>{labels?.[option] || option}</option>)}</select></label>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 pt-6 text-sm text-gray-700 dark:text-gray-200"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /> {label}</label>
}

function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-950"><tr>{headers.map(header => <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">{header}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

function Cell({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-2 align-top text-gray-700 dark:text-gray-200 ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>
}

function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'red' | 'blue' | 'amber' }) {
  const classes = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${classes[tone]}`}>{children}</span>
}

function StatusBadge({ value }: { value: string }) {
  const tone = value === 'completed' || value === 'resolved' || value === 'closed' ? 'green' : value === 'cancelled' || value === 'failed' ? 'red' : value === 'new' ? 'blue' : 'amber'
  return <Badge tone={tone}>{value}</Badge>
}

function PriorityBadge({ value }: { value: string }) {
  const tone = value === 'urgent' || value === 'high' ? 'red' : value === 'medium' ? 'amber' : 'gray'
  return <Badge tone={tone}>{value}</Badge>
}

function WarrantyBadge({ value }: { value?: string | null }) {
  const tone = value === 'in_warranty' ? 'green' : value === 'out_of_warranty' || value === 'void' ? 'red' : 'gray'
  return <Badge tone={tone}>{value || 'unknown'}</Badge>
}

function DataState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => Promise<void> }) {
  if (loading) return <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">Yukleniyor...</div>
  if (!error) return null
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><span>{error}</span><button className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1.5 font-semibold text-white" onClick={() => void onRetry()}><RefreshCw size={14} /> Tekrar dene</button></div>
}

function InfoPanel({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">{children}</section>
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.slice(0, 10)
}
