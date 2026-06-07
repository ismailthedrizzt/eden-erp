import { AlertCircle, Calendar, CheckCircle2, LockKeyhole, Save, X } from 'lucide-react'

export function FormPreview() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">Form Preview</h3>
        <p className="text-sm text-[var(--dl-text-secondary)]">Sirket taslak formu: input, select, date, textarea, locked helper, validation ve action butonlari.</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Field label="Unvan">
          <input readOnly value="Eden Savunma Teknolojileri A.S." className={inputClass()} />
          <p className="mt-1 text-xs text-[var(--dl-text-muted)]">Ticaret sicilindeki tam unvan ile ayni olmalidir.</p>
        </Field>
        <Field label="Sirket turu">
          <select disabled className={inputClass()} defaultValue="anonim">
            <option value="anonim">Anonim Sirket</option>
          </select>
        </Field>
        <Field label="Kurulus tarihi">
          <div className="relative">
            <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dl-text-muted)]" />
            <input readOnly value="12.06.2026" className={`${inputClass()} pl-9`} />
          </div>
        </Field>
        <Field label="Vergi numarasi">
          <input readOnly aria-invalid="true" value="" placeholder="10 haneli vergi numarasi" className={inputClass(true)} />
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--dl-danger)]"><AlertCircle size={13} /> Zorunlu alan eksik.</p>
        </Field>
        <Field label="Mersis numarasi">
          <div className="relative">
            <LockKeyhole size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--dl-text-muted)]" />
            <input readOnly value="0-1234-5678-901234" className={`${inputClass()} pl-9`} />
          </div>
          <p className="mt-1 text-xs text-[var(--dl-text-muted)]">Bu alan belge dogrulamasi tamamlanana kadar kilitli.</p>
        </Field>
        <Field label="Aciklama">
          <textarea readOnly value="Kurulus dosyasi on kontrol asamasinda. Imza sirkuleri ve vergi levhasi bekleniyor." className={`${inputClass()} min-h-24 resize-none py-2.5`} />
        </Field>
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-[var(--dl-input-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] px-4 py-2 text-sm font-semibold text-[var(--dl-text-secondary)]">
          <X size={15} /> Vazgec
        </button>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-[var(--dl-input-radius)] bg-[var(--dl-accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--dl-surface-raised)]">
          <Save size={15} /> Taslagi kaydet
        </button>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-[var(--dl-input-radius)] bg-[var(--dl-success)] px-4 py-2 text-sm font-semibold text-[var(--dl-surface-raised)]">
          <CheckCircle2 size={15} /> On kontrole gonder
        </button>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-[var(--dl-text-secondary)]">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}

function inputClass(error = false) {
  return [
    'w-full rounded-[var(--dl-input-radius)] border bg-[var(--dl-surface-base)] px-3 py-2 text-sm text-[var(--dl-text-primary)] outline-none',
    'placeholder:text-[var(--dl-text-muted)] focus:shadow-[var(--dl-shadow-focus)]',
    error ? 'border-[var(--dl-danger)]' : 'border-[var(--dl-border-subtle)]',
  ].join(' ')
}
