import countries from 'i18n-iso-countries'
import trLocale from 'i18n-iso-countries/langs/tr.json'

countries.registerLocale(trLocale)

export interface CountryNationality {
  id: string
  phoneCode: string
  country: string
  nationality: string
}

const NATIONALITY_OVERRIDES: Record<string, string> = {
  TR: 'Türk',
  TRNC: 'Kıbrıs Türkü',
  DE: 'Alman',
  FR: 'Fransız',
  GB: 'İngiliz',
  US: 'Amerikalı',
  IT: 'İtalyan',
  ES: 'İspanyol',
  GR: 'Yunan',
  BG: 'Bulgar',
  RO: 'Rumen',
  RU: 'Rus',
  UA: 'Ukraynalı',
  CN: 'Çinli',
  JP: 'Japon',
  KR: 'Güney Koreli',
  IR: 'İranlı',
  IQ: 'Iraklı',
  SY: 'Suriyeli',
  AZ: 'Azerbaycanlı',
  GE: 'Gürcü',
  AM: 'Ermeni',
  NL: 'Hollandalı',
  BE: 'Belçikalı',
  AT: 'Avusturyalı',
  CH: 'İsviçreli',
  SE: 'İsveçli',
  NO: 'Norveçli',
  DK: 'Danimarkalı',
  FI: 'Fin',
  PL: 'Polonyalı',
  CZ: 'Çek',
  SK: 'Slovak',
  HU: 'Macar',
  RS: 'Sırp',
  HR: 'Hırvat',
  BA: 'Bosnalı',
  AL: 'Arnavut',
  MK: 'Makedon',
  PT: 'Portekizli',
  IE: 'İrlandalı',
  CA: 'Kanadalı',
  AU: 'Avustralyalı',
  BR: 'Brezilyalı',
  AR: 'Arjantinli',
  MX: 'Meksikalı',
  EG: 'Mısırlı',
  ZA: 'Güney Afrikalı',
  IN: 'Hintli',
  PK: 'Pakistanlı',
  BD: 'Bangladeşli',
  ID: 'Endonezyalı',
  MY: 'Malezyalı',
  TH: 'Taylandlı',
  VN: 'Vietnamlı',
  SA: 'Suudi Arabistanlı',
  AE: 'BAE vatandaşı',
  IL: 'İsrailli',
  JO: 'Ürdünlü',
  LB: 'Lübnanlı',
  TN: 'Tunuslu',
  MA: 'Faslı',
  DZ: 'Cezayirli',
  LY: 'Libyalı',
  SD: 'Sudanlı',
}

const PHONE_CODE_OVERRIDES: Record<string, string> = {
  AD: '+376',
  AE: '+971',
  AF: '+93',
  AG: '+1268',
  AI: '+1264',
  AL: '+355',
  AM: '+374',
  AO: '+244',
  AR: '+54',
  AS: '+1684',
  AT: '+43',
  AU: '+61',
  AW: '+297',
  AX: '+35818',
  AZ: '+994',
  BA: '+387',
  BB: '+1246',
  BD: '+880',
  BE: '+32',
  BF: '+226',
  BG: '+359',
  BH: '+973',
  BI: '+257',
  BJ: '+229',
  BL: '+590',
  BM: '+1441',
  BN: '+673',
  BO: '+591',
  BQ: '+599',
  BR: '+55',
  BS: '+1242',
  BT: '+975',
  BV: '+47',
  BW: '+267',
  BY: '+375',
  BZ: '+501',
  CA: '+1',
  CC: '+61',
  CD: '+243',
  CF: '+236',
  CG: '+242',
  CH: '+41',
  CI: '+225',
  CK: '+682',
  CL: '+56',
  CM: '+237',
  CN: '+86',
  CO: '+57',
  CR: '+506',
  CU: '+53',
  CV: '+238',
  CW: '+599',
  CX: '+61',
  CY: '+357',
  CZ: '+420',
  DE: '+49',
  DJ: '+253',
  DK: '+45',
  DM: '+1767',
  DO: '+1',
  DZ: '+213',
  EC: '+593',
  EE: '+372',
  EG: '+20',
  EH: '+2',
  ER: '+291',
  ES: '+34',
  ET: '+251',
  FI: '+358',
  FJ: '+679',
  FK: '+500',
  FM: '+691',
  FO: '+298',
  FR: '+33',
  GA: '+241',
  GB: '+44',
  GD: '+1473',
  GE: '+995',
  GF: '+594',
  GG: '+44',
  GH: '+233',
  GI: '+350',
  GL: '+299',
  GM: '+220',
  GN: '+224',
  GP: '+590',
  GQ: '+240',
  GR: '+30',
  GS: '+500',
  GT: '+502',
  GU: '+1671',
  GW: '+245',
  GY: '+592',
  HK: '+852',
  HN: '+504',
  HR: '+385',
  HT: '+509',
  HU: '+36',
  ID: '+62',
  IE: '+353',
  IL: '+972',
  IM: '+44',
  IN: '+91',
  IO: '+246',
  IQ: '+964',
  IR: '+98',
  IS: '+354',
  IT: '+39',
  JE: '+44',
  JM: '+1',
  JO: '+962',
  JP: '+81',
  KE: '+254',
  KG: '+996',
  KH: '+855',
  KI: '+686',
  KM: '+269',
  KN: '+1869',
  KP: '+850',
  KR: '+82',
  KW: '+965',
  KY: '+1345',
  KZ: '+7',
  LA: '+856',
  LB: '+961',
  LC: '+1758',
  LI: '+423',
  LK: '+94',
  LR: '+231',
  LS: '+266',
  LT: '+370',
  LU: '+352',
  LV: '+371',
  LY: '+218',
  MA: '+212',
  MC: '+377',
  MD: '+373',
  ME: '+382',
  MF: '+590',
  MG: '+261',
  MH: '+692',
  MK: '+389',
  ML: '+223',
  MM: '+95',
  MN: '+976',
  MO: '+853',
  MP: '+1670',
  MQ: '+596',
  MR: '+222',
  MS: '+1664',
  MT: '+356',
  MU: '+230',
  MV: '+960',
  MW: '+265',
  MX: '+52',
  MY: '+60',
  MZ: '+258',
  NA: '+264',
  NC: '+687',
  NE: '+227',
  NF: '+672',
  NG: '+234',
  NI: '+505',
  NL: '+31',
  NO: '+47',
  NP: '+977',
  NR: '+674',
  NU: '+683',
  NZ: '+64',
  OM: '+968',
  PA: '+507',
  PE: '+51',
  PF: '+689',
  PG: '+675',
  PH: '+63',
  PK: '+92',
  PL: '+48',
  PM: '+508',
  PN: '+64',
  PR: '+1',
  PS: '+970',
  PT: '+351',
  PW: '+680',
  PY: '+595',
  QA: '+974',
  RE: '+262',
  RO: '+40',
  RS: '+381',
  RU: '+7',
  RW: '+250',
  SA: '+966',
  SB: '+677',
  SC: '+248',
  SD: '+249',
  SE: '+46',
  SG: '+65',
  SH: '+2',
  SI: '+386',
  SJ: '+4779',
  SK: '+421',
  SL: '+232',
  SM: '+378',
  SN: '+221',
  SO: '+252',
  SR: '+597',
  SS: '+211',
  ST: '+239',
  SV: '+503',
  SX: '+1721',
  SY: '+963',
  SZ: '+268',
  TC: '+1649',
  TD: '+235',
  TF: '+262',
  TG: '+228',
  TH: '+66',
  TJ: '+992',
  TK: '+690',
  TL: '+670',
  TM: '+993',
  TN: '+216',
  TO: '+676',
  TR: '+90',
  TRNC: '+90 392',
  TT: '+1868',
  TV: '+688',
  TW: '+886',
  TZ: '+255',
  UA: '+380',
  UG: '+256',
  UM: '+268',
  US: '+1',
  UY: '+598',
  UZ: '+998',
  VA: '+3',
  VC: '+1784',
  VE: '+58',
  VG: '+1284',
  VI: '+1340',
  VN: '+84',
  VU: '+678',
  WF: '+681',
  WS: '+685',
  XK: '+383',
  YE: '+967',
  YT: '+262',
  ZA: '+27',
  ZM: '+260',
  ZW: '+263',
}

const EXTRA_COUNTRIES: CountryNationality[] = [
  { id: 'TRNC', phoneCode: '+90 392', country: 'Kuzey Kıbrıs Türk Cumhuriyeti', nationality: 'Kıbrıs Türkü' },
  { id: 'XK', phoneCode: '+383', country: 'Kosova', nationality: 'Kosovalı' },
]

const generatedCountries = Object.keys(countries.getAlpha2Codes())
  .map((id): CountryNationality => {
    const country = countries.getName(id, 'tr') || id
    return {
      id,
      phoneCode: PHONE_CODE_OVERRIDES[id] || '',
      country,
      nationality: NATIONALITY_OVERRIDES[id] || `${country} vatandaşı`,
    }
  })

export const COUNTRY_NATIONALITIES: CountryNationality[] = [
  ...EXTRA_COUNTRIES,
  ...generatedCountries,
].sort((a, b) => {
  if (a.id === 'TR') return -1
  if (b.id === 'TR') return 1
  if (a.id === 'TRNC') return b.id === 'TR' ? 1 : -1
  if (b.id === 'TRNC') return a.id === 'TR' ? -1 : 1
  return a.country.localeCompare(b.country, 'tr')
})

export const COUNTRY_NATIONALITY_OPTIONS = COUNTRY_NATIONALITIES.map(item => ({
  value: item.id,
  label: item.nationality,
}))

export const COUNTRY_OPTIONS = COUNTRY_NATIONALITIES.map(item => ({
  value: item.id,
  label: item.country,
}))

export const COUNTRY_PHONE_OPTIONS = COUNTRY_NATIONALITIES.map(item => ({
  value: item.id,
  label: item.phoneCode ? `${item.phoneCode} ${item.country}` : item.country,
}))

export function normalizeCountryId(value?: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return 'TR'
  const lower = raw.toLocaleLowerCase('tr-TR')
  if (['tc', 't.c.', 't.c', 'tr', 'turkiye', 'türkiye', 'türk', 'turk'].includes(lower)) return 'TR'
  if (['kktc', 'trnc', 'kuzey kıbrıs türk cumhuriyeti'].includes(lower)) return 'TRNC'
  if (['xk', 'kosova', 'kosovalı'].includes(lower)) return 'XK'
  const upper = raw.toUpperCase()
  const byId = COUNTRY_NATIONALITIES.find(item => item.id === upper)
  if (byId) return byId.id
  const byName = COUNTRY_NATIONALITIES.find(item =>
    item.country.toLocaleLowerCase('tr-TR') === lower ||
    item.nationality.toLocaleLowerCase('tr-TR') === lower
  )
  return byName?.id || upper
}

export function isTurkishNationality(value?: unknown) {
  return normalizeCountryId(value) === 'TR'
}

export function getCountryNationalityLabel(value?: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  if (raw.toLocaleLowerCase('tr-TR') === 'yabanci') return 'Yabancı'
  const id = normalizeCountryId(raw)
  const item = COUNTRY_NATIONALITIES.find(country => country.id === id)
  return item?.nationality || raw
}

export function getCountryLabel(value?: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return '-'
  const id = normalizeCountryId(raw)
  const item = COUNTRY_NATIONALITIES.find(country => country.id === id)
  return item?.country || raw
}
