export type EmployeeLifecycleMode = 'entry' | 'exit'

export type LifecycleOption = {
  value: string
  label: string
  description?: string
}

export const SGK_RESPONSIBILITY_OPTIONS: LifecycleOption[] = [
  {
    value: 'company',
    label: 'Şirket',
    description: 'SGK bildirimi şirket tarafından takip edilir. Entegrasyon hazır olana kadar manuel tamamlama bilgisi girilir.',
  },
  {
    value: 'school_university',
    label: 'Okul / Üniversite',
    description: 'Staj veya eğitim kapsamındaki SGK bildirimi okul ya da üniversite tarafından yürütülür.',
  },
  {
    value: 'external_institution',
    label: 'Dış Kurum',
    description: 'SGK ya da sosyal güvence takibi dış hizmet veren kurumun sorumluluğundadır.',
  },
  {
    value: 'none',
    label: 'Yok',
    description: 'Bu çalışma ilişkisi için SGK bildirimi beklenmez.',
  },
]

export const EMPLOYMENT_TYPE_OPTIONS: LifecycleOption[] = [
  {
    value: 'permanent',
    label: 'Kadrolu',
    description: 'Şirket bünyesinde sürekli çalışan, genellikle bordro ve SGK bildirimi şirket tarafından yapılan personel.',
  },
  {
    value: 'contracted',
    label: 'Sözleşmeli',
    description: 'Belirli bir sözleşmeye dayalı çalışan. Süreli, süresiz, proje bazlı veya sefer bazlı olabilir.',
  },
  {
    value: 'intern',
    label: 'Stajyer',
    description: 'Eğitim veya staj kapsamında çalışan kişi. SGK bildirimi şirket, okul veya üniversite tarafından yapılabilir.',
  },
  {
    value: 'outsourced',
    label: 'Anlaşmalı / Dışarıdan',
    description: 'Şirket personeli gibi takip edilen ancak dış kaynak veya anlaşmalı modelle hizmet veren kişi.',
  },
  {
    value: 'consultant_freelancer',
    label: 'Danışman / Freelancer',
    description: 'Fatura, hizmet sözleşmesi veya proje bazlı çalışan bağımsız kişi. Genellikle bordro personeli değildir.',
  },
  {
    value: 'marine',
    label: 'Deniz Personeli',
    description: 'Gemi, sefer, rotasyon, vardiya veya denizcilik belgeleriyle takip edilen çalışan.',
  },
  {
    value: 'other',
    label: 'Diğer',
    description: 'Standart istihdam tiplerine uymayan özel çalışma ilişkileri.',
  },
]

export const DURATION_TYPE_OPTIONS: LifecycleOption[] = [
  { value: 'indefinite', label: 'Süresiz', description: 'Bitiş tarihi öngörülmeyen çalışma ilişkisi.' },
  { value: 'fixed_term', label: 'Süreli', description: 'Belirli başlangıç ve bitiş tarihleri olan çalışma ilişkisi.' },
  { value: 'project_based', label: 'Proje Bazlı', description: 'Bir proje kapsamı ve teslimiyle sınırlı çalışma ilişkisi.' },
  { value: 'voyage_based', label: 'Sefer Bazlı', description: 'Denizcilik veya saha seferi üzerinden takip edilen çalışma ilişkisi.' },
  { value: 'on_call', label: 'Çağrı Üzerine', description: 'İhtiyaç olduğunda çağrıya bağlı çalışma modeli.' },
]

export const WORK_ARRANGEMENT_OPTIONS: LifecycleOption[] = [
  { value: 'full_time', label: 'Tam Zamanlı', description: 'Standart tam zamanlı çalışma düzeni.' },
  { value: 'part_time', label: 'Kısmi Zamanlı', description: 'Haftalık çalışma süresi azaltılmış düzen.' },
  { value: 'remote', label: 'Uzaktan', description: 'Çalışmanın ana olarak uzaktan yürütüldüğü düzen.' },
  { value: 'hybrid', label: 'Hibrit', description: 'Ofis ve uzaktan çalışma birlikte uygulanır.' },
  { value: 'shift_based', label: 'Vardiyalı', description: 'Vardiya grupları veya dönüşümlü saatler üzerinden takip edilir.' },
  { value: 'field', label: 'Saha', description: 'Çalışmanın ağırlıklı olarak saha lokasyonlarında yürütüldüğü düzen.' },
  { value: 'marine_vessel', label: 'Deniz / Gemi', description: 'Gemi, platform veya sefer düzenine bağlı çalışma modeli.' },
]

export const PAYMENT_TYPE_OPTIONS: LifecycleOption[] = [
  { value: 'monthly_salary', label: 'Aylık Maaş', description: 'Aylık sabit ücret.' },
  { value: 'daily_wage', label: 'Günlük Ücret', description: 'Gün bazlı ücret.' },
  { value: 'hourly_wage', label: 'Saatlik Ücret', description: 'Saat bazlı ücret.' },
  { value: 'voyage_based_fee', label: 'Sefer Bazlı Ücret', description: 'Sefer veya rota bazında ödeme.' },
  { value: 'project_based_fee', label: 'Proje Bazlı Ücret', description: 'Proje kapsamı üzerinden ödeme.' },
  { value: 'invoice_based', label: 'Fatura Bazlı Ödeme', description: 'Fatura veya hizmet bedeli üzerinden ödeme.' },
  { value: 'bonus_commission', label: 'Prim / Komisyon', description: 'Prim, komisyon veya performans bazlı ödeme.' },
  { value: 'internship_fee', label: 'Staj Ücreti', description: 'Stajyer için belirlenen ödeme.' },
  { value: 'voluntary_unpaid', label: 'Ücretsiz / Gönüllü', description: 'Ücret ödemesi olmayan çalışma ilişkisi.' },
  { value: 'other', label: 'Diğer', description: 'Özel ücretlendirme modeli.' },
]

export const GROSS_NET_OPTIONS: LifecycleOption[] = [
  { value: 'gross', label: 'Brüt' },
  { value: 'net', label: 'Net' },
]

export const PAYMENT_PERIOD_OPTIONS: LifecycleOption[] = [
  { value: 'monthly', label: 'Aylık' },
  { value: 'weekly', label: 'Haftalık' },
  { value: 'daily', label: 'Günlük' },
  { value: 'milestone', label: 'Hakediş / Milestone' },
  { value: 'invoice', label: 'Fatura Dönemi' },
]

export const YES_NO_OPTIONS: LifecycleOption[] = [
  { value: 'yes', label: 'Evet' },
  { value: 'no', label: 'Hayır' },
]

const SGK_RESPONSIBILITY_ALIASES: Record<string, string> = {
  sgk_company: 'company',
  company: 'company',
  sirket: 'company',
  'Şirket': 'company',
  school: 'school_university',
  school_university: 'school_university',
  okul: 'school_university',
  external: 'external_institution',
  external_institution: 'external_institution',
  none: 'none',
  yok: 'none',
}

export function normalizeSgkResponsibility(value: unknown) {
  const key = String(value || '').trim()
  return SGK_RESPONSIBILITY_ALIASES[key] || key || 'company'
}

export function isCompanySgk(value: unknown) {
  return normalizeSgkResponsibility(value) === 'company'
}

export function optionLabel(options: LifecycleOption[], value: unknown, fallback = '-') {
  const normalized = String(value || '')
  return options.find(option => option.value === normalized)?.label || (normalized || fallback)
}

export function sgkResponsibilityLabel(value: unknown) {
  return optionLabel(SGK_RESPONSIBILITY_OPTIONS, normalizeSgkResponsibility(value))
}

export function statusLabel(value: unknown) {
  const labels: Record<string, string> = {
    draft: 'Taslak',
    active: 'Aktif',
    passive: 'Pasif',
    terminated: 'Sonlandı',
    pending_entry: 'İşe giriş bekliyor',
    manually_completed: 'Manuel tamamlandı',
    not_required: 'Gerekli değil',
  }
  const key = String(value || '')
  return labels[key] || key || '-'
}
