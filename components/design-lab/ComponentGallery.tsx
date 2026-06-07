import { ActionCenterPreview } from './ActionCenterPreview'
import { AuditTimelinePreview } from './AuditTimelinePreview'
import { DashboardPreview } from './DashboardPreview'
import { DocumentSlotPreview } from './DocumentSlotPreview'
import { EmptyErrorStatePreview } from './EmptyErrorStatePreview'
import { FormPreview } from './FormPreview'
import { IconLanguagePreview } from './IconLanguagePreview'
import { ListTablePreview } from './ListTablePreview'
import { WizardPreview } from './WizardPreview'
import type { ThemeConcept } from './themeConcepts'

interface ComponentGalleryProps {
  theme: ThemeConcept
}

export function ComponentGallery({ theme }: ComponentGalleryProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--dl-text-primary)]">Component Gallery</h2>
            <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">
              {theme.name} konsepti ayni dashboard, liste, form, wizard, belge, action, audit ve ikon orneklerinde deneniyor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {theme.bestFor.slice(0, 3).map(item => (
              <span key={item} className="rounded-full bg-[var(--dl-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--dl-text-secondary)]">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <DashboardPreview />
      <ListTablePreview />
      <FormPreview />
      <WizardPreview />
      <DocumentSlotPreview />
      <ActionCenterPreview />
      <AuditTimelinePreview />
      <IconLanguagePreview theme={theme} />
      <EmptyErrorStatePreview />
    </div>
  )
}
