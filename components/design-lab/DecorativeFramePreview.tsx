import { Box, CheckCircle2, FileSearch, PanelTop, Sparkles } from 'lucide-react'
import { MotifSurface, ThemeCornerMotif } from './DecorativeMotif'
import type { ThemeConcept } from './themeConcepts'

interface DecorativeFramePreviewProps {
  theme: ThemeConcept
}

export function DecorativeFramePreview({ theme }: DecorativeFramePreviewProps) {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--dl-text-primary)]">Decorative Frame / Corner Art</h3>
          <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">
            {theme.name} dekoratif dili: {theme.motif.illustrationType}.
          </p>
        </div>
        <span className="rounded-full bg-[var(--dl-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--dl-text-muted)]">
          {theme.motif.cornerType}
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <MotifSurface
          theme={theme}
          className="min-h-[220px] rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-5"
        >
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--dl-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--dl-text-muted)]">
                <Sparkles size={13} /> Hero corner art preview
              </div>
              <h4 className="mt-4 max-w-lg text-xl font-semibold text-[var(--dl-text-primary)]">
                Karakterli ama veri odakli ana ekran yuzeyi
              </h4>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--dl-text-secondary)]">
                Motif yalnizca koselerde ve kenarlarda hissedilir; KPI, tablo ve aksiyon metinlerinin onune gecmez.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {['Ciro', 'Belgeler', 'Onaylar'].map((label, index) => (
                <div key={label} className="rounded-[var(--dl-radius-large)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-muted)] p-3">
                  <div className="text-xs font-semibold text-[var(--dl-text-muted)]">{label}</div>
                  <div className="mt-2 text-lg font-semibold text-[var(--dl-text-primary)]">{index === 0 ? '24.5M' : index === 1 ? '134' : '18'}</div>
                </div>
              ))}
            </div>
          </div>
        </MotifSurface>

        <div className="grid gap-3">
          <MotifSurface
            theme={theme}
            placement="bottom-right"
            className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--dl-radius-large)] bg-[var(--dl-surface-muted)] text-[var(--dl-accent-primary)]">
                <Box size={18} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-[var(--dl-text-primary)]">Featured card border preview</h4>
                <p className="mt-1 text-sm leading-6 text-[var(--dl-text-secondary)]">
                  Buyuk ozet kartlarinda motif kontrollu bir kose cercevesi gibi davranir.
                </p>
              </div>
            </div>
          </MotifSurface>

          <div className="relative overflow-hidden rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-4">
            <ThemeCornerMotif theme={theme} placement="top-left" compact />
            <div className="relative z-10 flex items-center justify-between gap-3 border-b border-[var(--dl-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <PanelTop size={16} className="text-[var(--dl-accent-primary)]" />
                <h4 className="text-sm font-semibold text-[var(--dl-text-primary)]">Section header decorative preview</h4>
              </div>
              <span className="text-xs font-semibold text-[var(--dl-text-muted)]">1-3 odak</span>
            </div>
            <p className="relative z-10 mt-3 text-sm leading-6 text-[var(--dl-text-secondary)]">
              Header aksani basligi destekler; veri tablosu satirlarini veya form inputlarini suslemez.
            </p>
          </div>

          <MotifSurface
            theme={theme}
            placement="bottom-left"
            className="rounded-[var(--dl-card-radius)] border border-dashed border-[var(--dl-border-strong)] bg-[var(--dl-surface-muted)] p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--dl-radius-large)] bg-[var(--dl-surface-raised)] text-[var(--dl-accent-primary)]">
                <FileSearch size={18} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-[var(--dl-text-primary)]">Empty state motif preview</h4>
                <p className="mt-1 text-sm leading-6 text-[var(--dl-text-secondary)]">
                  Bos durumlarda motif hafif watermark olarak kalir ve ana mesaji bozmadan yuzeye kimlik katar.
                </p>
              </div>
            </div>
          </MotifSurface>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <MotifNote title="Dekoratif dil" body={theme.motif.note} />
        <MotifNote title="Light mode" body={theme.motif.lightBehavior} />
        <MotifNote title="Dark mode" body={theme.motif.darkBehavior} />
      </div>
    </section>
  )
}

function MotifNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--dl-radius-large)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-[var(--dl-text-muted)]">
        <CheckCircle2 size={13} className="text-[var(--dl-success)]" /> {title}
      </div>
      <p className="text-sm leading-6 text-[var(--dl-text-secondary)]">{body}</p>
    </div>
  )
}
