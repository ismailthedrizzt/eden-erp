export const COMMON_ACTION_GUIDE_MESSAGES = {
  permissionDenied: 'Bu islemi baslatmak icin gerekli yetkiniz bulunmuyor.',
  moduleDisabled: 'Gerekli modul bu calisma alaninda aktif degil.',
  recordRequired: 'Bu islem icin once ilgili kaydi acin.',
  dataSafe: 'Rehber veri degistirmez; veri degistiren adimlar ilgili sihirbazda sizin onayinizla tamamlanir.',
  emptyTitle: 'Ne yapmak istiyorsunuz?',
  emptyExplanation: 'Yapmak istediginiz isi yazin; Eden ERP sizi dogru sayfa ve sihirbaza yonlendirsin.',
}

export function statusRequirementMessage(label: string, statuses: string[]) {
  if (statuses.includes('active')) return `${label} yalnizca aktif kayitlarda baslatilabilir.`
  if (statuses.includes('draft')) return `${label} yalnizca taslak kayitlarda baslatilabilir.`
  return `${label} icin kayit durumu uygun degil.`
}

export function moduleMissingMessage(moduleKey: string) {
  if (moduleKey === 'partners') {
    return 'Bu islem icin Ortaklarimiz modulu ve guncel ortaklik dagilimi aktif olmalidir.'
  }
  if (moduleKey === 'branches') return 'Bu islem icin Subelerimiz modulu aktif olmalidir.'
  if (moduleKey === 'organization') return 'Organizasyon modulu aktif olmadigi icin ilgili birim/kadro adimi sinirli calisir.'
  if (moduleKey === 'facilities') return 'Tesisler/Lokasyonlar modulu aktif olmadigi icin fiziksel lokasyon kaydi otomatik olusturulamayabilir.'
  return `${moduleKey} modulu aktif olmalidir.`
}
