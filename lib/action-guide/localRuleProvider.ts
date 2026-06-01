import 'server-only'

export type LocalRuleAnswer = {
  title: string
  answer: string
  confidence: number
  steps?: string[]
}

const TECHNICAL_QUERY_TERMS = [
  'api',
  'architecture',
  'altyapi',
  'backend',
  'bff',
  'cache',
  'component',
  'database',
  'endpoint',
  'egitildin',
  'fastapi',
  'frontend',
  'kod',
  'hangi teknoloji',
  'llm',
  'markdown',
  'md dosya',
  'mimari',
  'model',
  'next.js',
  'ollama',
  'prompt',
  'provider',
  'react',
  'schema',
  'sql',
  'sunucu',
  'supabase',
  'tablo',
  'teknik altyapi',
  'teknoloji',
  'veritabani',
]

const FORBIDDEN_ANSWER_TERMS = [
  'api',
  'backend',
  'bff',
  'component',
  'database',
  'endpoint',
  'fastapi',
  'frontend',
  'kod',
  'llm',
  'markdown',
  'md dosya',
  'next.js',
  'ollama',
  'prompt',
  'provider',
  'react',
  'schema',
  'sql',
  'sunucu',
  'supabase',
  'tablo',
  'veritabani',
]

export function resolveLocalRuleAnswer(query: string): LocalRuleAnswer | null {
  const normalized = normalize(query)

  if (includesAny(normalized, ['master kimlik', 'merkezi kimlik', 'merkezi kayit', 'tekil kimlik', 'ayni kisi', 'farkli rollerde'])) {
    return {
      title: 'Merkezi kimlik neden var?',
      confidence: 0.96,
      answer: [
        'Master kimligi, ayni kisiyi uc ayri kartta uc ayri insan sanmamak icin dusunun.',
        'Bir kisi ayni anda calisan, ortak, temsilci ya da musteri yetkilisi olabilir. Bircok ERPde merkezi kayit olmadigi icin bu roller ayri ayri acilir; sonra kimin nerede hangi yetkiye sahip oldugu, hangi bilgisi guncel oldugu ve hangi iliskinin kapatilacagi zor takip edilir.',
        'Eden ERP kisiyi merkezde tutar, rolleri onun etrafina baglar. Boylece tek kisi, cok rol; daha az karisiklik, daha net kontrol.',
      ].join(' '),
    }
  }

  if (includesAny(normalized, ['lifecycle', 'yasam dongusu', 'resmi surec', 'resmi islem', 'neden degistir', 'kilitli alan', 'neden sihirbaz'])) {
    return {
      title: 'Resmi veriler neden sihirbazla degisir?',
      confidence: 0.94,
      answer: [
        'Gercek hayatta da sirket acilisi, sube kapanisi, sermaye artisi veya temsil yetkisi post-it ustunde degismez.',
        'Bu isler karar, belge, onay, tarih ve etki kontroluyle yurur. Eden ERP de ayni mantiga ayak uydurur: resmi veriler alelade alan gibi oynatilmaz.',
        'Sihirbazlar bu adimlari toplar; kayit hem duzenli kalir hem de sonradan "bunu kim, ne zaman, neden yapti?" sorusu cevapsiz kalmaz.',
      ].join(' '),
    }
  }

  if (includesAny(normalized, ['form mimari', 'form mimarisi', 'neden form', 'form neden'])) {
    return {
      title: 'Formlar neden boyle calisiyor?',
      confidence: 0.92,
      answer: [
        'Formun marangoz planini tezgaha sermeyeyim; is tarafinda mesele su:',
        'Sirket, ortak, temsilci, sube ve resmi degisiklikler ayni cekmeceye atilinca kisa vadede kolay gorunur ama sonra kim neyi degistirdi, hangi bilgi resmi sonuc dogurdu, hangi bilgi sadece hazirlikti sorulari birbirine girer.',
        'Bu yuzden Eden ERP formlari isi kendi yoluna koyar: hazirlik ayri, resmi degisiklik ayri, onay ve etki kontrolu ayri.',
      ].join(' '),
    }
  }

  if (isTechnicalInfrastructureQuestion(query)) {
    return guardedBusinessFallback()
  }

  return null
}

export function isTechnicalInfrastructureQuestion(query: string) {
  const normalized = normalize(query)
  return includesAny(normalized, TECHNICAL_QUERY_TERMS)
}

export function isUnsafeTechnicalAnswer(answer: string) {
  const normalized = normalize(answer)
  if (answer.includes('```') || answer.includes('/api/')) return true
  return includesAny(normalized, FORBIDDEN_ANSWER_TERMS)
}

export function guardedBusinessFallback(): LocalRuleAnswer {
  return {
    title: 'Bunu is diliyle anlatalim',
    confidence: 0.9,
    answer: [
      'Kaputu acip vida saymayalim; ben yolculuk tarafindayim.',
      'Kullanici acisindan Eden ERP, resmi kayitlari duzenli tutmak, ayni kisiyi farkli rollerde kaybetmemek ve kritik degisiklikleri dogru onay adimlarindan gecirmek icin boyle davranir.',
      'Kisacasi: daha az tekrar, daha az karisiklik, daha cok izlenebilirlik.',
    ].join(' '),
  }
}

function includesAny(value: string, terms: string[]) {
  return terms.some(term => value.includes(normalize(term)))
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .replace(/\u011f/g, 'g')
    .replace(/\u00fc/g, 'u')
    .replace(/\u015f/g, 's')
    .replace(/\u00f6/g, 'o')
    .replace(/\u00e7/g, 'c')
}
