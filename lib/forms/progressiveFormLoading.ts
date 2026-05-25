import type { FormLoadStage, FormLoadStageStatus, FormMode } from '@/components/ui/EntityForm'

type ProgressiveFormLoadingInput = {
  mode: FormMode | 'list'
  hasSnapshot?: boolean
  heroLoading?: boolean
  heroReady?: boolean
  heroError?: boolean
  mediaMetadataLoading?: boolean
  mediaMetadataReady?: boolean
  mediaMetadataError?: boolean
  profileLoading?: boolean
  profileReady?: boolean
  profileError?: boolean
  relationsSummaryLoading?: boolean
  relationsSummaryReady?: boolean
  relationsSummaryError?: boolean
  sectionDetailLoading?: boolean
  sectionDetailReady?: boolean
  sectionDetailError?: boolean
  historyLoading?: boolean
  historyReady?: boolean
  historyError?: boolean
  fullMediaLoading?: boolean
  fullMediaReady?: boolean
  fullMediaError?: boolean
  mediaLoading?: boolean
  mediaReady?: boolean
  mediaError?: boolean
  detailsLoading?: boolean
  detailsReady?: boolean
  detailsError?: boolean
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

  if (
    input.heroLoading !== undefined ||
    input.heroReady !== undefined ||
    input.mediaMetadataLoading !== undefined ||
    input.mediaMetadataReady !== undefined ||
    input.profileLoading !== undefined ||
    input.profileReady !== undefined ||
    input.relationsSummaryLoading !== undefined ||
    input.relationsSummaryReady !== undefined ||
    input.sectionDetailLoading !== undefined ||
    input.sectionDetailReady !== undefined ||
    input.historyLoading !== undefined ||
    input.historyReady !== undefined ||
    input.fullMediaLoading !== undefined ||
    input.fullMediaReady !== undefined ||
    input.mediaLoading !== undefined ||
    input.mediaReady !== undefined ||
    input.detailsLoading !== undefined ||
    input.detailsReady !== undefined
  ) {
    return [
      {
        key: 'hero',
        label: 'Hero alanı',
        status: sectionStatus(input.heroLoading, input.heroReady || input.hasSnapshot, input.heroError),
        description: 'Hero alanındaki temel bilgiler yükleniyor.',
      },
      {
        key: 'mediaMetadata',
        label: 'Medya metadata',
        status: sectionStatus(input.mediaMetadataLoading ?? input.mediaLoading, input.mediaMetadataReady ?? input.mediaReady, input.mediaMetadataError ?? input.mediaError),
        description: 'Belge ve görsel metadata bilgileri yükleniyor.',
      },
      {
        key: 'profile',
        label: 'Profil',
        status: sectionStatus(input.profileLoading ?? input.detailsLoading, input.profileReady ?? input.detailsReady, input.profileError ?? input.detailsError),
        description: 'Ana düzenlenebilir profil alanları yükleniyor.',
      },
      {
        key: 'relationsSummary',
        label: 'İlişki özeti',
        status: sectionStatus(input.relationsSummaryLoading, input.relationsSummaryReady, input.relationsSummaryError),
        description: 'İlişkili kayıtların hafif özetleri yükleniyor.',
      },
      {
        key: 'sectionDetail',
        label: 'Bölüm detayı',
        status: sectionStatus(input.sectionDetailLoading, input.sectionDetailReady, input.sectionDetailError),
        description: 'Açılan sekmeye ait detay verisi yükleniyor.',
      },
      {
        key: 'history',
        label: 'Geçmiş',
        status: sectionStatus(input.historyLoading, input.historyReady, input.historyError),
        description: 'Geçmiş yalnızca ilgili bölüm açıldığında yüklenir.',
      },
      {
        key: 'media',
        label: 'Fotoğraf ve belgeler',
        status: sectionStatus(input.mediaLoading, input.mediaReady, input.mediaError),
        description: 'Fotoğraf, avatar ve belge görselleri yükleniyor.',
      },
      {
        key: 'details',
        label: 'Detay alanları',
        status: sectionStatus(input.detailsLoading, input.detailsReady, input.detailsError),
        description: 'Sekmelerdeki detay alanları yükleniyor.',
      },
    ]
  }

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

function sectionStatus(loading?: boolean, ready?: boolean, error?: boolean): FormLoadStageStatus {
  if (error) return 'error'
  if (loading) return 'loading'
  if (ready) return 'ready'
  return 'idle'
}
