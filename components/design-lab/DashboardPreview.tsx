import { Activity, AlertTriangle, ArrowUpRight, Building2, Calendar, Clock, FileText, Headphones, WalletCards, type LucideIcon } from 'lucide-react'

const kpis: {
  label: string
  value: string
  sub: string
  trend: string
  tone: 'success' | 'warning' | 'danger' | 'info'
  icon: LucideIcon
  bars: number[]
}[] = [
  { label: 'Aktif Sirketler', value: '128', sub: '7 grup sirketi', trend: '+12%', tone: 'success', icon: Building2, bars: [36, 48, 42, 64, 72] },
  { label: 'Bekleyen Islemler', value: '34', sub: '11 kritik is', trend: '+5', tone: 'warning', icon: Clock, bars: [40, 52, 46, 58, 54] },
  { label: 'Eksik Belgeler', value: '19', sub: '6 zorunlu slot', trend: '-3', tone: 'danger', icon: FileText, bars: [72, 64, 58, 48, 42] },
  { label: 'Acik Cari Hareketler', value: '2.4M', sub: 'mutabakat bekler', trend: '+8%', tone: 'info', icon: WalletCards, bars: [28, 36, 44, 50, 62] },
  { label: 'Yaklasan Sozlesmeler', value: '12', sub: '30 gun icinde', trend: 'SLA', tone: 'warning', icon: Calendar, bars: [30, 34, 48, 58, 70] },
  { label: 'Acik Servis Talepleri', value: '47', sub: '9 saha gorevi', trend: '+4', tone: 'success', icon: Headphones, bars: [42, 46, 50, 56, 60] },
]

export function DashboardPreview() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <PreviewHeader
        title="Dashboard Preview"
        description="KPI cards, small trend badge, status chip, mini chart placeholder, empty state ve action summary."
      />
      <div className="mt-4 grid gap-[var(--dl-density-gap)] md:grid-cols-2 2xl:grid-cols-3">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <article
              key={kpi.label}
              className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4"
              style={{ borderTopColor: tokenForTone(kpi.tone), borderTopWidth: 3, boxShadow: 'var(--dl-shadow-subtle)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--dl-text-muted)]">{kpi.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--dl-text-primary)]">{kpi.value}</div>
                  <div className="mt-1 text-xs text-[var(--dl-text-secondary)]">{kpi.sub}</div>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--dl-radius-large)] bg-[var(--dl-surface-muted)]" style={{ color: tokenForTone(kpi.tone) }}>
                  <Icon size={18} />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div className="flex h-12 flex-1 items-end gap-1.5" aria-hidden="true">
                  {kpi.bars.map((bar, index) => (
                    <span
                      key={`${kpi.label}-${bar}-${index}`}
                      className="w-full rounded-t-[var(--dl-radius-small)] bg-[var(--dl-accent-primary)] opacity-80"
                      style={{ height: `${bar}%` }}
                    />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--dl-surface-muted)] px-2 py-1 text-xs font-semibold" style={{ color: tokenForTone(kpi.tone) }}>
                  <ArrowUpRight size={13} /> {kpi.trend}
                </span>
              </div>
            </article>
          )
        })}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[var(--dl-card-radius)] border border-dashed border-[var(--dl-border-strong)] bg-[var(--dl-surface-muted)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dl-text-primary)]">
            <Activity size={16} className="text-[var(--dl-accent-primary)]" /> Action summary
          </div>
          <p className="mt-2 text-sm text-[var(--dl-text-secondary)]">Bugun tamamlanan 18 islem, bekleyen 9 belge ve onay isteyen 4 surec tek bakista gorunur.</p>
        </div>
        <div className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-muted)] text-[var(--dl-warning)]">
              <AlertTriangle size={16} />
            </span>
            <div>
              <div className="text-sm font-semibold text-[var(--dl-text-primary)]">Bos state ornegi</div>
              <p className="mt-1 text-xs leading-5 text-[var(--dl-text-secondary)]">Filtreye uygun acik servis talebi yok. Farkli tarih araligi deneyin.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">{description}</p>
      </div>
      <span className="rounded-full bg-[var(--dl-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--dl-text-muted)]">Mock ERP data</span>
    </div>
  )
}

function tokenForTone(tone: 'success' | 'warning' | 'danger' | 'info') {
  if (tone === 'success') return 'var(--dl-success)'
  if (tone === 'warning') return 'var(--dl-warning)'
  if (tone === 'danger') return 'var(--dl-danger)'
  return 'var(--dl-info)'
}
