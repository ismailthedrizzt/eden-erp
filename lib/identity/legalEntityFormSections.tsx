import { ContactRound, Landmark, Phone } from 'lucide-react'
import type { FormField, FormTab } from '@/components/ui/EntityForm'

type FieldCondition = NonNullable<FormField['visibleWhen']>

type LegalEntityMasterTabOptions = {
  visibleWhen?: FieldCondition
  addressField?: string
  countryField?: string
  cityField?: string
  districtField?: string
  phoneField?: string
  emailField?: string
  websiteField?: string
  beneficiaryFullNameField?: string
  beneficiaryAddressField?: string
  beneficiaryAccountField?: string
  beneficiarySwiftBicField?: string
  beneficiaryBankNameField?: string
  beneficiaryBankAddressField?: string
  beneficiaryCurrencyField?: string
}

const currencyOptions = ['TRY', 'USD', 'EUR', 'GBP'].map(value => ({ value, label: value }))

function applyVisibleWhen(fields: FormField[], visibleWhen?: FieldCondition): FormField[] {
  if (!visibleWhen) return fields
  return fields.map(field => ({
    ...field,
    visibleWhen: field.visibleWhen || visibleWhen,
  }))
}

export function createLegalEntityMasterTabs({
  visibleWhen,
  addressField = 'address',
  countryField = 'country',
  cityField = 'city',
  districtField = 'district',
  phoneField = 'phone',
  emailField = 'email',
  websiteField = 'website',
  beneficiaryFullNameField = 'beneficiary_full_name',
  beneficiaryAddressField = 'beneficiary_address',
  beneficiaryAccountField = 'beneficiary_iban_or_account_no',
  beneficiarySwiftBicField = 'beneficiary_swift_bic',
  beneficiaryBankNameField = 'beneficiary_bank_name',
  beneficiaryBankAddressField = 'beneficiary_bank_address',
  beneficiaryCurrencyField = 'beneficiary_currency',
}: LegalEntityMasterTabOptions = {}): FormTab[] {
  return [
    {
      id: 'iletisim',
      label: 'İletişim',
      icon: <Phone size={16} />,
      fields: applyVisibleWhen([
        { name: phoneField, label: 'Telefon', type: 'tel' },
        { name: emailField, label: 'E-posta', type: 'email' },
        { name: websiteField, label: 'Web Sitesi', type: 'text' },
        { name: countryField, label: 'Ülke', type: 'select', compact: true },
        { name: cityField, label: 'İl', type: 'text', compact: true },
        { name: districtField, label: 'İlçe', type: 'text', compact: true },
        { name: addressField, label: 'Adres', type: 'textarea', colSpan: 3 },
      ], visibleWhen),
    },
    {
      id: 'banka',
      label: 'Banka',
      icon: <Landmark size={16} />,
      fields: applyVisibleWhen([
        { name: beneficiaryFullNameField, label: 'Lehtar Tam Adı', type: 'text', colSpan: 2 },
        { name: beneficiaryAddressField, label: 'Lehtar Adresi', type: 'textarea', colSpan: 3 },
        { name: beneficiaryAccountField, label: 'IBAN veya Hesap Numarası', type: 'text', colSpan: 2 },
        { name: beneficiarySwiftBicField, label: 'SWIFT/BIC Kodu', type: 'text' },
        { name: beneficiaryBankNameField, label: 'Alıcı Banka Adı', type: 'text', colSpan: 2 },
        { name: beneficiaryBankAddressField, label: 'Alıcı Banka Adresi', type: 'textarea', colSpan: 3 },
        { name: beneficiaryCurrencyField, label: 'Para Birimi', type: 'select', compact: true, options: currencyOptions, defaultValue: 'TRY' },
      ], visibleWhen),
    },
    {
      id: 'irtibat_noktalari',
      label: 'İrtibat Noktaları',
      icon: <ContactRound size={16} />,
      fields: applyVisibleWhen([
        {
          name: 'contact_points',
          label: 'İrtibat Noktaları',
          type: 'list',
          colSpan: 3,
          listConfig: {
            addLabel: 'İrtibat Noktası Ekle',
            emptyText: 'İrtibat noktası eklenmedi.',
            fields: [
              { name: 'name', key: 'name', label: 'Kişi Adı Soyadı', type: 'text', required: true },
              { name: 'department_title', key: 'department_title', label: 'Birimi / Ünvanı', type: 'text' },
              { name: 'phone', key: 'phone', label: 'Telefon', type: 'tel' },
              { name: 'email', key: 'email', label: 'E-posta', type: 'email' },
            ],
          },
        },
      ], visibleWhen),
    },
  ]
}
