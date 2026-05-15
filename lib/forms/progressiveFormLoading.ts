import type { FormLoadStage, FormLoadStageStatus, FormMode } from '@/components/ui/EntityForm'

type ProgressiveFormLoadingInput = {
  mode: FormMode | 'list'
  hasSnapshot?: boolean
  detailLoading?: boolean
  detailError?: boolean
  detailReady?: boolean
  hasMaster?: boolean
  masterLoading?: boolean
  referencesLoading?: boolean
  referencesReady?: boolean
  referencesError?: boolean
}

export function createProgressiveFormLoadStages(input: ProgressiveFormLoadingInput): FormLoadStage[] {
  if (input.mode === 'list' || input.mode === 'create') return []

  const detailStatus: FormLoadStageStatus = input.detailError
    ? 'error'
    : input.detailLoading
      ? 'loading'
      : input.detailReady || input.hasSnapshot
        ? 'ready'
        : 'idle'

  const masterStatus: FormLoadStageStatus = input.masterLoading
    ? 'loading'
    : input.hasMaster
      ? 'ready'
      : 'skipped'

  const referencesStatus: FormLoadStageStatus = input.referencesError
    ? 'error'
    : input.referencesLoading
      ? 'loading'
      : input.referencesReady
        ? 'ready'
        : 'skipped'

  return [
    {
      key: 'snapshot',
      label: 'Liste satırı',
      status: input.hasSnapshot ? 'ready' : 'idle',
      description: 'Form ilk anda liste satırındaki veriyle açılır.',
    },
    {
      key: 'detail',
      label: 'Detay kayıt',
      status: detailStatus,
      description: 'Sayfanın bağlı olduğu ana tablo satırı arka planda tamamlanır.',
    },
    {
      key: 'master',
      label: 'Master kayıt',
      status: masterStatus,
      description: 'Master kimlik veya kurum/kişi kartı alanları geldikçe form zenginleşir.',
    },
    {
      key: 'references',
      label: 'Referans alanlar',
      status: referencesStatus,
      description: 'Dropdown, bağlı kayıt ve başka modüllerden gelen alan seçenekleri ayrıca yüklenir.',
    },
  ]
}
