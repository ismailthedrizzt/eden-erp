import { Building2, CheckCircle2, FileText, History, KeyRound, ShieldCheck, TrendingUp } from 'lucide-react'

const events = [
  { icon: Building2, title: 'Sirket taslagi olusturuldu', actor: 'Ismail Ilgar', time: 'Bugun 09:12', detail: 'Taslak no: CMP-2026-041' },
  { icon: CheckCircle2, title: 'Sirket acilisi tamamlandi', actor: 'Sistem', time: 'Bugun 10:04', detail: 'Durum: taslak -> aktif' },
  { icon: TrendingUp, title: 'Sermaye artirimi yapildi', actor: 'Finans ekibi', time: 'Dun 16:44', detail: '100.000 TL -> 250.000 TL' },
  { icon: FileText, title: 'Belge dogrulandi', actor: 'Belge servisi', time: 'Dun 15:20', detail: 'Vergi levhasi: hash ****92fa' },
  { icon: KeyRound, title: 'Yetki limiti degisti', actor: 'Admin', time: '05.06.2026 12:18', detail: 'Limit: **** -> 1.000.000 TL' },
]

export function AuditTimelinePreview() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">Audit Timeline Preview</h3>
        <p className="text-sm text-[var(--dl-text-secondary)]">Timeline density, event icon, actor, timestamp, old/new summary ve masked sensitive values.</p>
      </div>

      <div className="mt-4 rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--dl-text-primary)]">
          <History size={16} className="text-[var(--dl-accent-primary)]" /> Denetim izi
        </div>
        <div className="space-y-3">
          {events.map((event, index) => {
            const Icon = event.icon
            return (
              <div key={event.title} className="grid grid-cols-[34px_1fr] gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dl-surface-muted)] text-[var(--dl-accent-primary)]">
                    <Icon size={15} />
                  </span>
                  {index < events.length - 1 && <span className="mt-2 h-full min-h-7 w-px bg-[var(--dl-border-subtle)]" />}
                </div>
                <div className="rounded-[var(--dl-radius-large)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-muted)] px-3 py-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold text-[var(--dl-text-primary)]">{event.title}</div>
                    <div className="font-mono text-[11px] text-[var(--dl-text-muted)]">{event.time}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--dl-text-secondary)]">
                    <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> {event.actor}</span>
                    <span>{event.detail}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
