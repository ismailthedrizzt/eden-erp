import { Archive, Bell, Calendar, Check, Clock, ExternalLink } from 'lucide-react'

const tasks = [
  { title: 'Sirket acilisi icin belge eksik', entity: 'Eden Uretim Makina', due: 'Bugun 16:00', priority: 'Kritik', done: false },
  { title: 'Mehmet Teknisyen SGK Girisi bekliyor', entity: 'Insan Kaynaklari', due: 'Yarin', priority: 'Yuksek', done: false },
  { title: 'Sermaye artirimi odeme mutabakati', entity: 'PlaneGuard Teknoloji', due: '3 gun', priority: 'Orta', done: false },
  { title: 'Yetki belgesi 15 gun icinde doluyor', entity: 'Eden Savunma A.S.', due: '15 gun', priority: 'Izle', done: true },
]

export function ActionCenterPreview() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">Action Center Preview</h3>
        <p className="text-sm text-[var(--dl-text-secondary)]">Priority badge, due date, related entity, action button ve done/dismiss state.</p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {tasks.map(task => (
          <article key={task.title} className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4 opacity-100" style={{ opacity: task.done ? 0.72 : 1 }}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--dl-radius-large)] bg-[var(--dl-surface-muted)] text-[var(--dl-accent-primary)]">
                <Bell size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge label={task.priority} />
                  {task.done && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--dl-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--dl-success)]"><Check size={12} /> tamamlandi</span>}
                </div>
                <div className="mt-2 text-sm font-semibold text-[var(--dl-text-primary)]">{task.title}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--dl-text-muted)]">
                  <span className="inline-flex items-center gap-1"><ExternalLink size={13} /> {task.entity}</span>
                  <span className="inline-flex items-center gap-1"><Calendar size={13} /> {task.due}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="inline-flex items-center gap-1.5 rounded-[var(--dl-input-radius)] border border-[var(--dl-border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--dl-text-secondary)]">
                <Archive size={14} /> Ertele
              </button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-[var(--dl-input-radius)] bg-[var(--dl-accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--dl-surface-raised)]">
                <Clock size={14} /> Islemi ac
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function PriorityBadge({ label }: { label: string }) {
  const color = label === 'Kritik' ? 'var(--dl-danger)' : label === 'Yuksek' ? 'var(--dl-warning)' : label === 'Orta' ? 'var(--dl-info)' : 'var(--dl-success)'
  return <span className="rounded-full bg-[var(--dl-surface-muted)] px-2 py-1 text-xs font-semibold" style={{ color }}>{label}</span>
}
