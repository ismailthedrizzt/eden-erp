const EDUCATION_LEVELS = [
  { value: 'ilkokul', label: 'İlkokul Mezunu' },
  { value: 'ortaokul_ioo', label: 'Ortaokul Mezunu' },
  { value: 'lise_dengi', label: 'Lise Mezunu' },
  { value: 'yuksekokul_fakulte', label: 'Yüksekokul / Fakülte Mezunu' },
  { value: 'yuksek_lisans', label: 'Yüksek Lisans Mezunu' },
  { value: 'doktora', label: 'Doktora Mezunu' },
] as const

type EducationLevelValue = typeof EDUCATION_LEVELS[number]['value']
type EducationLevel = { value: EducationLevelValue; label: string; index: number }

const LEVEL_BY_VALUE: Record<string, EducationLevel> = Object.fromEntries(
  EDUCATION_LEVELS.map((level, index) => [level.value, { ...level, index }])
)
const LEGACY_LABEL_TO_VALUE = new Map([
  ['İlkokul', 'ilkokul'],
  ['Ortaokul ya da İ.Ö.O', 'ortaokul_ioo'],
  ['Ortaokul ya da İ.O.O', 'ortaokul_ioo'],
  ['Lise veya dengi okullar', 'lise_dengi'],
  ['Yüksekokul veya fakülte', 'yuksekokul_fakulte'],
  ['Yüksek Okul', 'yuksekokul_fakulte'],
  ['Yüksek Lisans', 'yuksek_lisans'],
  ['Doktora', 'doktora'],
])

function normalizeEducationValue(value: unknown) {
  if (!value) return ''
  const text = String(value).trim()
  if (LEVEL_BY_VALUE[text]) return text
  return LEGACY_LABEL_TO_VALUE.get(text) || text.toLocaleLowerCase('tr-TR').replace(/\s+/g, '_')
}

export function getCompletedEducationValue(school: Record<string, unknown>) {
  const degree = normalizeEducationValue(school.derece)
  if (!degree || !LEVEL_BY_VALUE[degree]) return ''

  if (school.devam_ediyor) {
    const level = LEVEL_BY_VALUE[degree]
    return level && level.index > 0 ? EDUCATION_LEVELS[level.index - 1].value : ''
  }

  return degree
}

export function getEducationLevelValue(employees: { is_illiterate?: boolean; education_schools?: Array<Record<string, unknown>> }) {
  if (employees.is_illiterate) return 'Okuryazar Değcity'

  const schools = Array.isArray(employees.education_schools) ? employees.education_schools : []
  let bestValue = ''
  let bestIndex = -1

  schools.forEach((school) => {
    const completedValue = getCompletedEducationValue(school)
    const level = completedValue ? LEVEL_BY_VALUE[completedValue] : undefined
    if (level && level.index > bestIndex) {
      bestValue = level.value
      bestIndex = level.index
    }
  })

  return bestValue
}

export function getEducationSummary(employees: { is_illiterate?: boolean; education_schools?: Array<Record<string, unknown>> }) {
  if (employees.is_illiterate) return 'Okuryazar Değcity'

  const schools = Array.isArray(employees.education_schools) ? employees.education_schools : []
  const bestValue = getEducationLevelValue(employees)
  const bestLabel = bestValue ? LEVEL_BY_VALUE[bestValue]?.label : ''
  const fallback = schools.find(school => school.derece || school.okul_adi)

  return bestLabel || String(fallback?.derece || fallback?.okul_adi || '-')
}
