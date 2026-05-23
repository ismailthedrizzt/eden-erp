import {
  LIFECYCLE_DOCUMENTS_STEP_ID,
  LIFECYCLE_INFORMATION_STEP_ID,
  type LifecycleWizardDocumentWrite,
} from '@/lib/lifecycle/lifecycleWizardTemplate'
import type {
  RecordLifecycleWizardField,
  RecordLifecycleWizardSection,
  RecordLifecycleWizardStep,
} from './RecordLifecycleWizard'

export function createLifecycleInformationStep(
  sections: RecordLifecycleWizardSection[],
  options: { description?: string } = {}
): RecordLifecycleWizardStep {
  return {
    id: LIFECYCLE_INFORMATION_STEP_ID,
    title: 'Bilgiler',
    description: options.description,
    sections,
  }
}

export function createLifecycleDocumentsStep({
  sectionId,
  sectionTitle,
  documents,
  description,
}: {
  sectionId: string
  sectionTitle: string
  documents: readonly LifecycleWizardDocumentWrite[]
  description?: string
}): RecordLifecycleWizardStep {
  return {
    id: LIFECYCLE_DOCUMENTS_STEP_ID,
    title: 'Belgeler',
    description,
    sections: [{
      id: sectionId,
      title: sectionTitle,
      fields: documents.map(createLifecycleDocumentField),
    }],
  }
}

export function createLifecycleDocumentField(write: LifecycleWizardDocumentWrite): RecordLifecycleWizardField {
  return {
    name: write.sourceField,
    label: write.label || write.slotTitle,
    type: 'document',
    required: write.required,
    colSpan: 3,
    documentMode: 'newOnly',
  }
}
