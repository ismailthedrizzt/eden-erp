import { AlertTriangle, CheckCircle2, Clock, Download, Eye, FileText, RefreshCw, UploadCloud } from 'lucide-react'

const slots = [
  { title: 'Ticaret Sicil Gazetesi', rule: 'zorunlu', state: 'Yuklendi', tone: 'success' },
  { title: 'Imza Sirkuleri', rule: 'onerilen', state: 'Eksik', tone: 'danger' },
  { title: 'Vergi Levhasi', rule: 'dogrulama', state: 'Bekliyor', tone: 'warning' },
]

export function DocumentSlotPreview() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div>
        <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">Document Slot Preview</h3>
        <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">Sirket acilisi belgeleri: status badge, upload, preview/download, duplicate reuse notice ve warning state.</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {slots.map(slot => (
          <article key={slot.title} className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--dl-radius-large)] bg-[var(--dl-surface-muted)]" style={{ color: tokenForTone(slot.tone) }}>
                {slot.tone === 'success' ? <CheckCircle2 size={18} /> : slot.tone === 'warning' ? <Clock size={18} /> : <AlertTriangle size={18} />}
              </span>
              <Status label={slot.state} tone={slot.tone} />
            </div>
            <div className="mt-3 text-sm font-semibold text-[var(--dl-text-primary)]">{slot.title}</div>
            <div className="mt-1 text-xs text-[var(--dl-text-muted)]">{slot.rule}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-1.5 rounded-[var(--dl-input-radius)] bg-[var(--dl-accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--dl-surface-raised)]">
                <UploadCloud size={14} /> Yukle
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-[var(--dl-input-radius)] border border-[var(--dl-border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--dl-text-secondary)]">
                <Eye size={14} /> Onizle
              </button>
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--dl-input-radius)] border border-[var(--dl-border-subtle)] text-[var(--dl-text-secondary)]" aria-label={`${slot.title} indir`}>
                <Download size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-[var(--dl-card-radius)] border border-[var(--dl-border-strong)] bg-[var(--dl-surface-muted)] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-base)] text-[var(--dl-info)]">
            <RefreshCw size={16} />
          </span>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dl-text-primary)]"><FileText size={15} /> Ayni dosya yeniden kullanildi</div>
            <p className="mt-1 text-sm leading-6 text-[var(--dl-text-secondary)]">Vergi levhasi daha once Cari Kartlar modulunde yuklenmis. Bu slotta referans olarak baglandi; yeni dosya kopyasi olusturulmadi.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Status({ label, tone }: { label: string; tone: string }) {
  return <span className="rounded-full bg-[var(--dl-surface-muted)] px-2 py-1 text-xs font-semibold" style={{ color: tokenForTone(tone) }}>{label}</span>
}

function tokenForTone(tone: string) {
  if (tone === 'success') return 'var(--dl-success)'
  if (tone === 'warning') return 'var(--dl-warning)'
  return 'var(--dl-danger)'
}
