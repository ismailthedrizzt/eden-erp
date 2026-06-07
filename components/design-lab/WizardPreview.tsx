import { AlertTriangle, CheckCircle2, Circle, ClipboardCheck, FileText, LockKeyhole, ShieldCheck } from 'lucide-react'

const steps = [
  { label: 'On Kontrol', status: 'completed' },
  { label: 'Bilgiler', status: 'completed' },
  { label: 'Belgeler', status: 'active' },
  { label: 'Ozet', status: 'blocked' },
  { label: 'Onay', status: 'pending' },
]

export function WizardPreview() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div>
        <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">Wizard Preview</h3>
        <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">Sirket acilisi: completed, active, blocked ve pending step state karsilastirmasi.</p>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step.label} className="relative rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-3">
            <div className="flex items-center gap-2">
              <StepIcon status={step.status} />
              <span className="text-sm font-semibold text-[var(--dl-text-primary)]">{step.label}</span>
            </div>
            <div className="mt-2 text-xs text-[var(--dl-text-muted)]">Adim {index + 1} / 5</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-muted)] text-[var(--dl-warning)]">
              <AlertTriangle size={16} />
            </span>
            <div>
              <div className="text-sm font-semibold text-[var(--dl-text-primary)]">Warning panel</div>
              <p className="mt-1 text-sm leading-6 text-[var(--dl-text-secondary)]">Imza sirkuleri eksik oldugu icin Ozet ve Onay adimlari kilitli. Belge yuklenince akis otomatik acilir.</p>
            </div>
          </div>
        </div>
        <div className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--dl-text-primary)]">
            <ClipboardCheck size={16} className="text-[var(--dl-accent-primary)]" /> Summary comparison
          </div>
          <div className="grid gap-2 text-xs">
            <CompareLine label="Sermaye" oldValue="100.000 TL" newValue="250.000 TL" />
            <CompareLine label="Yetkili" oldValue="Mehmet K." newValue="Mehmet K. + Ayse I." />
            <CompareLine label="Belge" oldValue="2/4" newValue="3/4" />
          </div>
        </div>
      </div>
    </section>
  )
}

function StepIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={17} className="text-[var(--dl-success)]" />
  if (status === 'active') return <FileText size={17} className="text-[var(--dl-accent-primary)]" />
  if (status === 'blocked') return <LockKeyhole size={17} className="text-[var(--dl-warning)]" />
  return <Circle size={17} className="text-[var(--dl-text-muted)]" />
}

function CompareLine({ label, oldValue, newValue }: { label: string; oldValue: string; newValue: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr_1fr] gap-2 rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-muted)] px-3 py-2 text-[var(--dl-text-secondary)]">
      <span className="font-semibold text-[var(--dl-text-primary)]">{label}</span>
      <span className="inline-flex items-center gap-1"><ShieldCheck size={12} /> {oldValue}</span>
      <span className="inline-flex items-center gap-1 text-[var(--dl-success)]"><CheckCircle2 size={12} /> {newValue}</span>
    </div>
  )
}
