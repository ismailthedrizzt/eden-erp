type OperationControlledField = {
  field: string
  label: string
  operation: string
}

const COMPANY_OPERATION_CONTROLLED_FIELDS: OperationControlledField[] = [
  { field: 'trade_name', label: 'Ticari unvan', operation: 'Unvan Değişikliği' },
  { field: 'tax_number', label: 'VKN', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'tax_office', label: 'Vergi dairesi', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'mersis_number', label: 'MERSİS no', operation: 'Şirket Açılışı / Tescil Bilgisi Düzeltme' },
  { field: 'trade_registry_number', label: 'Ticaret sicil no', operation: 'Şirket Açılışı / Tescil Bilgisi Düzeltme' },
  { field: 'foundation_date', label: 'Kuruluş tarihi', operation: 'Şirket Açılışı' },
  { field: 'company_type', label: 'Şirket türü', operation: 'Şirket Açılışı / Tescil Bilgisi Düzeltme' },
  { field: 'country', label: 'Ülke', operation: 'Adres Değişikliği' },
  { field: 'city', label: 'İl', operation: 'Adres Değişikliği' },
  { field: 'district', label: 'İlçe', operation: 'Adres Değişikliği' },
  { field: 'address', label: 'Adres', operation: 'Adres Değişikliği' },
  { field: 'committed_capital_amount', label: 'Taahhüt edilen sermaye', operation: 'Sermaye Artırımı / Sermaye Azaltımı' },
  { field: 'paid_capital_amount', label: 'Ödenen sermaye', operation: 'Sermaye Ödeme / Muhasebe İşlemi' },
  { field: 'electronic_notification_address', label: 'Elektronik tebligat adresi', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'trade_registry_office', label: 'Ticaret sicili müdürlüğü', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'e_invoice_taxpayer', label: 'E-Fatura mükellefiyeti', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'e_archive_taxpayer', label: 'E-Arşiv mükellefiyeti', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'e_waybill_taxpayer', label: 'E-İrsaliye mükellefiyeti', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'sgk_workplace_registry_no', label: 'SGK işyeri sicil no', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'sgk_province', label: 'SGK il', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'sgk_branch', label: 'SGK şube', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'risk_class', label: 'Tehlike sınıfı', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'nace_codes', label: 'NACE kodları', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
]

const DIRECT_RELATION_PATCH_FIELDS: OperationControlledField[] = [
  { field: 'partners', label: 'Ortaklar', operation: 'Ortaklık İşlemleri' },
  { field: 'representatives', label: 'Temsilciler', operation: 'Temsilci İşlemleri' },
  { field: 'stakeholders', label: 'Paydaşlar', operation: 'Paydaş İşlemleri' },
  { field: 'company_nace_codes', label: 'NACE kodları', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'public_tax', label: 'Vergi bilgileri', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'public_sgk', label: 'SGK bilgileri', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'public_incentives', label: 'Teşvik bilgileri', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'public_registry', label: 'Sicil bilgileri', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'public_licenses', label: 'Ruhsat bilgileri', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
  { field: 'public_channels', label: 'Dijital kamu kanalları', operation: 'Kamu / Tescil Bilgisi Değişikliği' },
]

const operationControlledByField = new Map(COMPANY_OPERATION_CONTROLLED_FIELDS.map(field => [field.field, field]))
const relationControlledByField = new Map(DIRECT_RELATION_PATCH_FIELDS.map(field => [field.field, field]))

export type CompanyPatchViolation = {
  code: 'COMPANY_OPERATION_CONTROLLED_FIELDS' | 'COMPANY_RELATION_PATCH_NOT_ALLOWED'
  message: string
  fields: OperationControlledField[]
}

export function getDisallowedCompanyRelationPatchViolation(payload: Record<string, unknown>): CompanyPatchViolation | null {
  const fields = DIRECT_RELATION_PATCH_FIELDS.filter(item => Object.prototype.hasOwnProperty.call(payload, item.field))
  if (!fields.length) return null

  return {
    code: 'COMPANY_RELATION_PATCH_NOT_ALLOWED',
    fields,
    message: `${fields.map(field => field.label).join(', ')} ana şirket PATCH'i ile güncellenemez. İlgili işlem endpointini kullanın.`,
  }
}

export function getOperationControlledCompanyPatchViolation(
  payload: Record<string, unknown>,
  current: Record<string, unknown>
): CompanyPatchViolation | null {
  const fields = COMPANY_OPERATION_CONTROLLED_FIELDS.filter(item => {
    if (!Object.prototype.hasOwnProperty.call(payload, item.field)) return false
    return !sameCompanyPatchValue(item.field, payload[item.field], current[item.field])
  })

  if (!fields.length) return null

  return {
    code: 'COMPANY_OPERATION_CONTROLLED_FIELDS',
    fields,
    message: `${fields.map(field => field.label).join(', ')} resmi işlem kontrollü alanlardır. Bu alanlar ilgili wizard/API route üzerinden değiştirilmelidir.`,
  }
}

export function getCompanyOperationControlledField(field: string) {
  return operationControlledByField.get(field) || relationControlledByField.get(field) || null
}

function sameCompanyPatchValue(field: string, nextValue: unknown, currentValue: unknown) {
  if (nextValue === undefined) return true
  if (nextValue === null && (currentValue === null || currentValue === undefined || currentValue === '')) return true

  if (field === 'committed_capital_amount' || field === 'paid_capital_amount') {
    const nextNumber = Number(nextValue ?? 0)
    const currentNumber = Number(currentValue ?? 0)
    return Number.isFinite(nextNumber) && Number.isFinite(currentNumber) && Math.abs(nextNumber - currentNumber) < 0.0001
  }

  return JSON.stringify(normalizeComparableValue(nextValue)) === JSON.stringify(normalizeComparableValue(currentValue))
}

function normalizeComparableValue(value: unknown) {
  if (value === undefined) return null
  if (value === '') return null
  return value
}
