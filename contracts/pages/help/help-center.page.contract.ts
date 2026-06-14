import type { EdenPageContract } from '../../core/page.contract'

export const helpCenterPageContract = {
  route: '/app/yardim',
  pageKind: 'dashboard',
  owningEntity: 'help',
  allowedActions: ['open_action_guide', 'start_global_tour', 'reset_help_preferences'],
  requiredComponents: ['HelpTopicGrid', 'ActionGuideButton', 'TourResetButton'],
  requiredStates: { empty: true, loading: false, error: true },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  help: {
    badgeLabel: 'Yardim Merkezi',
    title: 'Dogru isleme hizli ulasin',
    description: 'Isinizi yazin, ilgili sayfa veya sihirbaz yolunu acin; engel varsa nedenini ve dogru sonraki adimi gorun.',
    openGuideLabel: 'Rehberi Ac',
    openGuideQuery: 'Ne yapmak istiyorsunuz?',
    startTourLabel: 'Yardimi Tekrar Goster',
    resetHintsLabel: 'Ipuclarini Sifirla',
    forceTourStorageKey: 'eden.forceSystemTour',
    tourRoute: '/app?tour=1',
    topics: [
      { key: 'company_opening', title: 'Sirket nasil acilir?', summary: '+ Ekle ile sirket karti taslagi olusturun, resmi acilis icin Sirket Acilisi sihirbazini tamamlayin.', actionQuery: 'sirket acilisi' },
      { key: 'create_partner_draft', title: 'Ortak nasil eklenir?', summary: 'Ortak karti taslagi kisi/kurum bilgisini tutar. Pay ve haklar Ilk Ortaklik Girisi veya ortaklik islemleriyle olusur.', actionQuery: 'yeni ortak ekle' },
      { key: 'representative_start', title: 'Temsilciye yetki nasil verilir?', summary: 'Temsilci karti yetki dogurmaz. Banka, GIB, SGK, limit ve kapsam Temsilcilik Baslatma veya yetki islemleriyle verilir.', actionQuery: 'temsilciye banka yetkisi verecegim' },
      { key: 'branch_opening', title: 'Sube nasil acilir?', summary: 'Sube acilisi aktif sirket kartindan baslatilir. Taslak sirketlerde once Sirket Acilisi tamamlanir.', actionQuery: 'sube acmak istiyorum' },
      { key: 'capital_increase', title: 'Sermaye artirimi nasil yapilir?', summary: 'Sermaye Artirimi icin aktif sirket, Ortaklarimiz modulu ve guncel ortaklik dagilimi gerekir.', actionQuery: 'sermaye artirimi nasil yapilir' },
      { key: 'audit_show_record_history', title: 'Denetim izi nedir?', summary: 'Yetkili kullanici bir kaydi kimin, ne zaman, hangi islemle degistirdigini Audit ekranindan izler.', actionQuery: 'bu kaydi kim degistirdi' },
      { key: 'open_setup_center', title: 'Kurulum eksikleri nasil tamamlanir?', summary: 'Kurulum Merkezi modul, lisans, bagimlilik ve hazirlik eksiklerini is diliyle gosterir.', actionQuery: 'kurulum eksiklerini goster' },
    ],
  },
} as const satisfies EdenPageContract & {
  help: {
    badgeLabel: string
    title: string
    description: string
    openGuideLabel: string
    openGuideQuery: string
    startTourLabel: string
    resetHintsLabel: string
    forceTourStorageKey: string
    tourRoute: string
    topics: readonly { key: string; title: string; summary: string; actionQuery: string }[]
  }
}
