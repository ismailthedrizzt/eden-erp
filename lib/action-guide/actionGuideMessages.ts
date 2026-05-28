export const COMMON_ACTION_GUIDE_MESSAGES = {
  permissionDenied: 'Bu islemi baslatmak icin gerekli yetkiniz bulunmuyor.',
  moduleDisabled: 'Gerekli modul bu calisma alaninda aktif degil.',
  recordRequired: 'Bu islem icin once ilgili kaydi acin.',
  dataSafe: 'Rehber veri degistirmez; veri degistiren adimlar ilgili sihirbazda sizin onayinizla tamamlanir.',
  emptyTitle: 'Ne yapmak istiyorsunuz?',
  emptyExplanation: 'Yapmak istediginiz isi yazin; Eden ERP sizi dogru sayfa ve sihirbaza yonlendirsin.',
  lowConfidenceTitle: 'Birkac olasi islem buldum',
  lowConfidenceExplanation: 'Yazdiginiz ifade icin tek bir islemden emin degilim. Asagidaki seceneklerden uygun olani acabilirsiniz.',
}

export function statusRequirementMessage(label: string, statuses: string[]) {
  if (statuses.includes('active')) return `${label} yalnizca aktif kayitlarda baslatilabilir.`
  if (statuses.includes('draft')) return `${label} yalnizca taslak kayitlarda baslatilabilir.`
  return `${label} icin kayit durumu uygun degil.`
}

export function moduleMissingMessage(moduleKey: string) {
  if (moduleKey === 'partners') {
    return 'Bu islem icin Ortaklarimiz modulu aktif olmalidir.'
  }
  if (moduleKey === 'branches') return 'Bu islem icin Subelerimiz modulu aktif olmalidir.'
  if (moduleKey === 'organization') return 'Sube bazli organizasyon/kadro adimi icin Teskilat/Kadro modulu aktif olmalidir.'
  if (moduleKey === 'facilities') return 'Tesis/lokasyon bazli yetki veya otomatik lokasyon kaydi icin Tesisler/Lokasyonlar modulu aktif olmalidir.'
  if (moduleKey === 'representatives') return 'Bu islem icin Temsilcilerimiz modulu aktif olmalidir.'
  if (moduleKey === 'settings') return 'Bu islem icin Sistem ayarlari modulune erisim olmalidir.'
  return `${moduleKey} modulu aktif olmalidir.`
}
