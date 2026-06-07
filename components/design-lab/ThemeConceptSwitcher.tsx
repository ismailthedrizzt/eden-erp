import { ThemeConceptCard } from './ThemeConceptCard'
import type { ThemeConcept, ThemeConceptId } from './themeConcepts'

interface ThemeConceptSwitcherProps {
  concepts: ThemeConcept[]
  activeId: ThemeConceptId
  onChange: (id: ThemeConceptId) => void
}

export function ThemeConceptSwitcher({ concepts, activeId, onChange }: ThemeConceptSwitcherProps) {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-subtle)' }}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--dl-text-primary)]">Theme Concepts</h2>
          <p className="text-sm text-[var(--dl-text-secondary)]">Ayni ERP bloklarini dort farkli gorsel kimlik tokeniyle karsilastir.</p>
        </div>
        <span className="text-xs font-semibold text-[var(--dl-text-muted)]">Active: {concepts.find(item => item.id === activeId)?.name}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {concepts.map(concept => (
          <ThemeConceptCard key={concept.id} theme={concept} active={concept.id === activeId} onSelect={onChange} />
        ))}
      </div>
    </section>
  )
}
