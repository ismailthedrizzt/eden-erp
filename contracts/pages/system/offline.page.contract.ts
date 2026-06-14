import type { EdenPageContract } from '../../core/page.contract'

export const offlinePageContract = {
  route: '/offline',
  pageKind: 'shell',
  owningEntity: 'shell',
  allowedActions: ['return_home'],
  requiredComponents: ['OfflineNotice', 'ReturnHomeLink'],
  requiredStates: {
    empty: true,
    loading: false,
    error: false,
  },
  releaseStatus: 'live',
  visibleInProduction: true,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  offline: {
    title: 'Baglanti yok',
    message: 'Eden ERP cevrimdisi modda acildi. Daha once ziyaret edilen sayfalar ve statik varliklar onbellekten gelebilir; canli veriler icin baglanti yeniden kurulmali.',
    actionHref: '/app',
    actionLabel: 'Ana sayfaya don',
  },
} as const satisfies EdenPageContract & {
  offline: {
    title: string
    message: string
    actionHref: string
    actionLabel: string
  }
}
