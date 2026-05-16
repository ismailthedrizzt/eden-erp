export type SgkCodeOption = {
  value: string
  label: string
}

export type SgkCodeListsPayload = {
  source: string
  updatedAt?: string
  categories: Record<string, SgkCodeOption[]>
}

const FALLBACK_SGK_CODE_LISTS: SgkCodeListsPayload = {
  source: 'sgk-4a-xml-yardim-doc',
  categories: {
    insuranceBranches: [
      { value: '0', label: 'Mecburi Sigortalı' },
      { value: '7', label: 'Çıraklar' },
      { value: '8', label: 'Sosyal Güvenlik Destek Primi' },
      { value: '12', label: 'Uluslararası sözleşmesi olmayan yabancı uyruklu sigortalı' },
      { value: '14', label: 'Ceza evi çalışanı' },
      { value: '16', label: 'İŞKUR kursiyerleri' },
      { value: '17', label: 'İş kaybı tazminatı alanlar' },
      { value: '18', label: 'YÖK kısmi istihdam' },
      { value: '19', label: 'Stajyer öğrenciler' },
      { value: '24', label: 'İntörn öğrenci' },
      { value: '25', label: 'Harp/vazife malulleri ile 2330 ve 3713 SK kapsamı aylık alanlar' },
      { value: '32', label: 'Bursiyer' },
      { value: '33', label: 'Güvenlik korucusu' },
      { value: '34', label: 'Geçici 20 kapsamında zorunlu sigortalı' },
      { value: '35', label: 'Geçici 20 kapsamında sosyal güvenlik destekleme primi' },
      { value: '37', label: 'Tamamlayıcı ya da alan eğitimi gören öğrenciler' },
    ],
    dutyCodes: [
      { value: '1', label: 'İşveren veya vekili' },
      { value: '2', label: 'İşçi' },
      { value: '3', label: '657 SK (4/b) kapsamında çalışanlar' },
      { value: '4', label: '657 SK (4/c) kapsamında çalışanlar' },
      { value: '5', label: 'Çıraklar ve stajyer öğrenciler' },
      { value: '6', label: 'Diğerleri' },
    ],
    educationCodes: [
      { value: '0', label: 'Bilinmeyen' },
      { value: '1', label: 'Okur yazar değil' },
      { value: '2', label: 'İlkokul' },
      { value: '3', label: 'Ortaokul ya da ilköğretim okulu' },
      { value: '4', label: 'Lise veya dengi okul' },
      { value: '5', label: 'Yüksek okul veya fakülte' },
      { value: '6', label: 'Yüksek lisans' },
      { value: '7', label: 'Doktora' },
    ],
    exitReasons: [
      { value: '1', label: 'Deneme süreli iş sözleşmesinin işverence feshi' },
      { value: '2', label: 'Deneme süreli iş sözleşmesinin işçi tarafından feshi' },
      { value: '3', label: 'Belirsiz süreli iş sözleşmesinin işçi tarafından feshi' },
      { value: '4', label: 'Belirsiz süreli iş sözleşmesinin işveren tarafından haklı sebep bildirilmeden feshi' },
      { value: '5', label: 'Belirli süreli iş sözleşmesinin sona ermesi' },
      { value: '8', label: 'Emeklilik veya toptan ödeme nedeniyle' },
      { value: '9', label: 'Malulen emeklilik nedeniyle' },
      { value: '10', label: 'Ölüm' },
      { value: '11', label: 'İş kazası sonucu ölüm' },
      { value: '12', label: 'Askerlik' },
      { value: '13', label: 'Kadın işçinin evlenmesi' },
      { value: '14', label: 'Emeklilik için yaş dışında diğer şartların tamamlanması' },
      { value: '15', label: 'Toplu işçi çıkarma' },
      { value: '16', label: 'Nakil' },
      { value: '17', label: 'Çalıştığı işyerinin kapanması / feshi' },
      { value: '18', label: 'İşin sona ermesi' },
      { value: '19', label: 'Mevsim bitimi' },
      { value: '20', label: 'Kampanya bitimi' },
      { value: '21', label: 'Statü değişikliği' },
      { value: '22', label: 'Diğer nedenler' },
      { value: '23', label: 'İşçi tarafından zorunlu nedenlerle fesih' },
      { value: '24', label: 'İşçi tarafından sağlık nedeniyle fesih' },
      { value: '25', label: 'İşverenin ahlak ve iyi niyet kurallarına aykırı davranışı nedeniyle' },
      { value: '26', label: 'Disiplin kurulu kararı ile' },
      { value: '27', label: 'İşveren tarafından zorunlu nedenlerle ve tutukluluk nedeniyle' },
      { value: '28', label: 'İşveren tarafından sağlık nedeniyle' },
      { value: '29', label: 'İşveren tarafından işçinin ahlak ve iyi niyet kurallarına aykırı davranışı nedeniyle' },
      { value: '30', label: 'Vize süresinin bitimi' },
      { value: '31', label: 'Kanun kapsamı dışında kendi istek ve kusuru dışında' },
      { value: '32', label: '4046 sayılı kanunun 21. maddesine göre özelleştirme nedeniyle' },
      { value: '33', label: 'Gazeteci tarafından sözleşmenin feshi' },
      { value: '34', label: 'İşyerinin devri, işin veya işyerinin niteliğinin değişmesi nedeniyle' },
      { value: '35', label: '6495 SK nedeniyle devlet memurluğuna geçenler' },
      { value: '36', label: 'OHAL / KHK' },
      { value: '37', label: 'KHK ile kamu görevinden çıkarma' },
      { value: '39', label: '696 KHK ile kamu işçiliğine geçiş' },
      { value: '40', label: '696 KHK ile kamu işçiliğine geçilememesi sebebiyle çıkış' },
    ],
    documentTypes: [
      { value: '0', label: 'Belge türü seçilmedi' },
      { value: '1', label: 'Hizmet akdi ile tüm sigorta kollarına tabi çalışanlar' },
      { value: '2', label: 'Sosyal güvenlik destek primine tabi çalışanlar' },
      { value: '4', label: 'Yer altında sürekli çalışanlar' },
      { value: '5', label: 'Yer altında gruplu çalışanlar' },
      { value: '6', label: 'Yer üstün gruplu çalışanlar' },
      { value: '7', label: 'Aday çırak, çırak ve mesleki işletmelerde eğitim gören öğrenciler' },
      { value: '12', label: 'Geçici 20. maddeye tabi olanlar' },
      { value: '13', label: 'Tüm sigorta kollarına tabi olup işsizlik sigortası primi kesilmeyenler' },
      { value: '14', label: "Libya'da çalışanlar" },
      { value: '19', label: 'Ceza infaz kurumları ve tutukevleri tesis/atölyelerinde çalıştırılan hükümlü ve tutuklular' },
      { value: '20', label: "İstisna akdine istinaden Almanya'ya götürülen Türk işçiler" },
      { value: '21', label: 'Sosyal güvenlik sözleşmesi imzalanmamış ülkelere götürülen Türk işçileri' },
      { value: '22', label: 'Zorunlu staja tabi tutulan meslek lisesi veya yüksek öğrenim öğrencileri' },
      { value: '23', label: 'Harp malulleri ve 3713/2330 kapsamındakilerden kısa vadeli sigorta kollarına tabi olanlar' },
      { value: '24', label: 'Harp malulleri ve 3713/2330 kapsamındakilerden kısa ve uzun vadeli sigorta kollarına tabi olanlar' },
      { value: '25', label: 'Türkiye İş Kurumu eğitimlerine katılan kursiyerler' },
      { value: '28', label: '4046 sayılı kanunun 21. maddesi kapsamında iş kaybı tazminatı alanlar' },
      { value: '29', label: 'Tüm sigorta kollarına tabi, 60 gün fiili hizmet süresi zammına tabi çalışanlar' },
      { value: '30', label: 'İşsizlik sigortası hariç, 60 gün fiili hizmet süresi zammına tabi çalışanlar' },
      { value: '31', label: 'Harp malulleri ve 3713/2330 kapsamındakilerden 60 gün fiili hizmet zammına tabi olanlar' },
      { value: '32', label: 'Tüm sigorta kollarına tabi, 90 gün fiili hizmet süresi zammına tabi çalışanlar' },
      { value: '33', label: 'İşsizlik sigortası hariç, 90 gün fiili hizmet süresi zammına tabi çalışanlar' },
      { value: '34', label: 'Harp malulleri ve 3713/2330 kapsamındakilerden 90 gün fiili hizmet zammına tabi olanlar' },
      { value: '35', label: 'Tüm sigorta kollarına tabi, 180 gün fiili hizmet süresi zammına tabi çalışanlar' },
      { value: '36', label: 'İşsizlik sigortası hariç, 180 gün fiili hizmet süresi zammına tabi çalışanlar' },
      { value: '37', label: 'Harp malulleri ve 3713/2330 kapsamındakilerden 180 gün fiili hizmet zammına tabi olanlar' },
      { value: '39', label: 'Uzun vadeli sigorta kolunun uygulanmasını talep etmeyen Birleşik Krallık/İsviçre kapsamındakiler' },
      { value: '41', label: 'Kamu idarelerinde iş akdi askıda olanlar' },
      { value: '42', label: 'Aday çırak, çırak ve mesleki eğitim öğrencilerinden bakmakla yükümlü olunmayanlar' },
      { value: '43', label: 'Staj/kısmi zamanlı öğrencilerden bakmakla yükümlü olunmayanlar' },
      { value: '44', label: 'Türkiye İş Kurumu kursiyerlerinden bakmakla yükümlü olunmayanlar' },
      { value: '48', label: 'Emekli yer altında çalışan' },
      { value: '49', label: 'Tamamlayıcı bakmakla yükümlü' },
      { value: '50', label: 'Tamamlayıcı bakmakla yükümlü olmayan' },
      { value: '51', label: 'Güvenlik korucuları ek-15' },
    ],
    csgbBusinessLines: [
      { value: '01', label: 'Tarım ve ormancılık, avcılık ve balıkçılık' },
      { value: '02', label: 'Madencilik' },
      { value: '03', label: 'Petrol, kimya ve lastik' },
      { value: '04', label: 'Gıda sanayii' },
      { value: '05', label: 'Şeker' },
      { value: '06', label: 'Dokuma' },
      { value: '07', label: 'Deri' },
      { value: '08', label: 'Ağaç' },
      { value: '09', label: 'Kağıt' },
      { value: '10', label: 'Basın ve yayın' },
      { value: '11', label: 'Banka ve sigorta' },
      { value: '12', label: 'Çimento, toprak ve cam' },
      { value: '13', label: 'Metal' },
      { value: '14', label: 'Gemi' },
      { value: '15', label: 'İnşaat' },
      { value: '16', label: 'Enerji' },
      { value: '17', label: 'Ticaret, büro, eğitim ve güzel sanatlar' },
      { value: '18', label: 'Kara taşımacılığı' },
      { value: '19', label: 'Demir yolu taşımacılığı' },
      { value: '20', label: 'Deniz taşımacılığı' },
      { value: '21', label: 'Hava taşımacılığı' },
      { value: '22', label: 'Ardiye ve antrepoculuk' },
      { value: '23', label: 'Haberleşme' },
      { value: '24', label: 'Sağlık' },
      { value: '25', label: 'Konaklama ve eğlence yerleri' },
      { value: '26', label: 'Milli savunma' },
      { value: '27', label: 'Gazetecilik' },
      { value: '28', label: 'Genel işler' },
    ],
    occupationCodes: [
      { value: '0000.00', label: 'Meslek kodu seçilmedi' },
    ],
  },
}

export function getFallbackSgkCodeLists(): SgkCodeListsPayload {
  return FALLBACK_SGK_CODE_LISTS
}

export function normalizeSgkCodeListsPayload(payload: unknown): SgkCodeListsPayload | null {
  if (!payload || typeof payload !== 'object') return null
  const candidate = payload as Partial<SgkCodeListsPayload>
  if (!candidate.categories || typeof candidate.categories !== 'object') return null

  const categories = Object.fromEntries(
    Object.entries(candidate.categories).map(([key, options]) => [
      key,
      normalizeOptions(options),
    ])
  )

  return {
    source: typeof candidate.source === 'string' ? candidate.source : 'reference_data',
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
    categories,
  }
}

function normalizeOptions(options: unknown): SgkCodeOption[] {
  if (!Array.isArray(options)) return []
  return options
    .map((option) => {
      if (!option || typeof option !== 'object') return null
      const row = option as Record<string, unknown>
      const value = String(row.value ?? row.code ?? '').trim()
      const label = String(row.label ?? row.name ?? row.description ?? value).trim()
      if (!value) return null
      return { value, label }
    })
    .filter((option): option is SgkCodeOption => Boolean(option))
}
