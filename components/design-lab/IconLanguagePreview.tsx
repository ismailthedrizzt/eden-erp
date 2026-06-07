import { Activity, AlertTriangle, Bell, Building2, CheckCircle2, FileArchive, FileText, Handshake, Landmark, Scale, ShieldCheck, Users, WalletCards, Wrench, XCircle, type LucideIcon } from 'lucide-react'
import type { ThemeConcept } from './themeConcepts'

const modules: { label: string; icon: LucideIcon; color: string }[] = [
  { label: 'Sirketler', icon: Building2, color: 'var(--dl-accent-primary)' },
  { label: 'Ortaklar', icon: Users, color: 'var(--dl-accent-secondary)' },
  { label: 'Temsilciler', icon: Scale, color: 'var(--dl-accent-warm)' },
  { label: 'Subeler', icon: Landmark, color: 'var(--dl-info)' },
  { label: 'Muhasebe', icon: WalletCards, color: 'var(--dl-success)' },
  { label: 'IK', icon: Handshake, color: 'var(--dl-accent-secondary)' },
  { label: 'Belgeler', icon: FileArchive, color: 'var(--dl-warning)' },
  { label: 'Sozlesmeler', icon: FileText, color: 'var(--dl-accent-primary)' },
  { label: 'Action Center', icon: Bell, color: 'var(--dl-danger)' },
  { label: 'Audit', icon: Activity, color: 'var(--dl-info)' },
]

export function IconLanguagePreview({ theme }: { theme: ThemeConcept }) {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div>
        <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">Icon Language Preview</h3>
        <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">Raw icon yerine tasarlanmis container, modul rengi ve status ikon dili.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {modules.map(module => {
          const Icon = module.icon
          return (
            <div key={module.label} className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--dl-radius-large)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-muted)]" style={{ color: module.color }}>
                <Icon size={18} strokeWidth={theme.iconStyle.strokeWidth} />
              </span>
              <div className="mt-3 text-sm font-semibold text-[var(--dl-text-primary)]">{module.label}</div>
              <div className="mt-1 text-xs text-[var(--dl-text-muted)]">{theme.iconStyle.moduleIconBackground}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <StatusIcon icon={CheckCircle2} label="Success" color="var(--dl-success)" note="dogrulandi" strokeWidth={theme.iconStyle.strokeWidth} />
        <StatusIcon icon={AlertTriangle} label="Warning" color="var(--dl-warning)" note="aksiyon bekler" strokeWidth={theme.iconStyle.strokeWidth} />
        <StatusIcon icon={XCircle} label="Error" color="var(--dl-danger)" note="blokaj var" strokeWidth={theme.iconStyle.strokeWidth} />
      </div>
    </section>
  )
}

function StatusIcon({ icon: Icon, label, color, note, strokeWidth }: { icon: LucideIcon; label: string; color: string; note: string; strokeWidth: number }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-muted)]" style={{ color }}>
        <Icon size={17} strokeWidth={strokeWidth} />
      </span>
      <div>
        <div className="text-sm font-semibold text-[var(--dl-text-primary)]">{label}</div>
        <div className="text-xs text-[var(--dl-text-muted)]">{note}</div>
      </div>
    </div>
  )
}
