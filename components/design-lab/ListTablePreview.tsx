import { AlertTriangle, CheckCircle2, Clock, Filter, MoreHorizontal, Search } from 'lucide-react'

const rows = [
  { status: 'Aktif', title: 'Eden Savunma A.S.', type: 'Anonim', city: 'Ankara', lastAction: 'Sermaye artirimi', document: 'Tam', selected: false },
  { status: 'Inceleme', title: 'PlaneGuard Teknoloji', type: 'Limited', city: 'Istanbul', lastAction: 'Yetki limiti', document: 'Bekliyor', selected: true },
  { status: 'Eksik', title: 'Eden Uretim Makina', type: 'Anonim', city: 'Konya', lastAction: 'Sube acilisi', document: 'Eksik', selected: false },
  { status: 'Pasif', title: 'Eden Danismanlik', type: 'Limited', city: 'Izmir', lastAction: 'Cari mutabakat', document: 'Arsiv', selected: false },
]

export function ListTablePreview() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">List / Table Preview</h3>
          <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">Yogun ERP tablosu, selected row, hover, badge, action menu ve pagination.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex h-9 min-w-[220px] items-center gap-2 rounded-[var(--dl-input-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] px-3 text-sm text-[var(--dl-text-muted)]">
            <Search size={15} /> Sirket veya cari ara
          </div>
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-[var(--dl-input-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] px-3 text-sm font-semibold text-[var(--dl-text-secondary)]">
            <Filter size={15} /> Filtre
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['Durum: acik', 'Sehir: tumu', 'Belge: riskli', 'Son 30 gun'].map(filter => (
          <span key={filter} className="rounded-full bg-[var(--dl-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--dl-text-secondary)]">{filter}</span>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)]">
        <table className="min-w-[860px] w-full border-collapse bg-[var(--dl-surface-base)] text-sm">
          <thead>
            <tr className="bg-[var(--dl-surface-muted)] text-left text-[11px] font-semibold uppercase text-[var(--dl-text-muted)]">
              <th className="px-3 py-3">Durum</th>
              <th className="px-3 py-3">Unvan / Cari</th>
              <th className="px-3 py-3">Tur</th>
              <th className="px-3 py-3">Sehir</th>
              <th className="px-3 py-3">Son Islem</th>
              <th className="px-3 py-3">Belge Durumu</th>
              <th className="px-3 py-3 text-right">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.title} className="border-t border-[var(--dl-border-subtle)] transition hover:bg-[var(--dl-surface-muted)]" style={{ minHeight: 'var(--dl-density-row)', backgroundColor: row.selected ? 'var(--dl-surface-muted)' : undefined }}>
                <td className="px-3 py-3"><StatusBadge label={row.status} /></td>
                <td className="px-3 py-3 font-semibold text-[var(--dl-text-primary)]">{row.title}</td>
                <td className="px-3 py-3 text-[var(--dl-text-secondary)]">{row.type}</td>
                <td className="px-3 py-3 text-[var(--dl-text-secondary)]">{row.city}</td>
                <td className="px-3 py-3 text-[var(--dl-text-secondary)]">{row.lastAction}</td>
                <td className="px-3 py-3"><DocumentBadge label={row.document} /></td>
                <td className="px-3 py-3 text-right">
                  <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--dl-radius-medium)] text-[var(--dl-text-muted)] hover:bg-[var(--dl-surface-muted)]" aria-label={`${row.title} aksiyonlari`}>
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-xs text-[var(--dl-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>1-4 / 128 kayit</span>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-[var(--dl-radius-medium)] border border-[var(--dl-border-subtle)] px-2.5 py-1 font-semibold text-[var(--dl-text-secondary)]">Onceki</button>
          <button type="button" className="rounded-[var(--dl-radius-medium)] bg-[var(--dl-accent-primary)] px-2.5 py-1 font-semibold text-[var(--dl-surface-raised)]">1</button>
          <button type="button" className="rounded-[var(--dl-radius-medium)] border border-[var(--dl-border-subtle)] px-2.5 py-1 font-semibold text-[var(--dl-text-secondary)]">Sonraki</button>
        </div>
      </div>
    </section>
  )
}

function StatusBadge({ label }: { label: string }) {
  const Icon = label === 'Aktif' ? CheckCircle2 : label === 'Eksik' ? AlertTriangle : Clock
  const color = label === 'Aktif' ? 'var(--dl-success)' : label === 'Eksik' ? 'var(--dl-danger)' : label === 'Pasif' ? 'var(--dl-text-muted)' : 'var(--dl-warning)'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--dl-surface-muted)] px-2 py-1 text-xs font-semibold" style={{ color }}>
      <Icon size={13} /> {label}
    </span>
  )
}

function DocumentBadge({ label }: { label: string }) {
  const color = label === 'Tam' ? 'var(--dl-success)' : label === 'Eksik' ? 'var(--dl-danger)' : label === 'Bekliyor' ? 'var(--dl-warning)' : 'var(--dl-text-muted)'
  return <span className="rounded-full bg-[var(--dl-surface-muted)] px-2 py-1 text-xs font-semibold" style={{ color }}>{label}</span>
}
