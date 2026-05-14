import { ContactRound, Landmark, Phone } from 'lucide-react'
import type { FormField, FormTab } from '@/components/ui/EntityForm'
import { EntityBankAccountsPanel } from '@/components/ui/EntityBankAccountsPanel'

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
  beneficiaryIbanField?: string
  beneficiaryAccountField?: string
  beneficiaryBankCodeField?: string
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
  beneficiaryIbanField = 'beneficiary_iban',
  beneficiaryAccountField = 'beneficiary_account_no',
  beneficiaryBankCodeField = 'beneficiary_bank_code',
  beneficiarySwiftBicField = 'beneficiary_swift_bic',
  beneficiaryBankNameField = 'beneficiary_bank_name',
  beneficiaryBankAddressField = 'beneficiary_bank_address',
  beneficiaryCurrencyField = 'beneficiary_currency',
}: LegalEntityMasterTabOptions = {}): FormTab[] {
  return [
    {
      id: 'tuzel_kisi_iletisim',
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
      id: 'tuzel_kisi_banka',
      label: 'Banka',
      icon: <Landmark size={16} />,
      fields: applyVisibleWhen([
        {
          name: 'entity_bank_accounts',
          label: 'Banka Bilgileri',
          type: 'custom',
          colSpan: 3,
          render: ({ value, onChange, data, readOnly }) => (
            <EntityBankAccountsPanel
              entityKind="organization"
              entityId={data.master_record_id || data.organization_id}
              masterName={data.legal_name || data.trade_name || data.ticari_unvan || data.display_name || data.kisa_unvan}
              masterCountry={data.country || data.ulke}
              readOnly={readOnly}
              value={Array.isArray(value) ? value : data.entity_bank_accounts}
              onChange={onChange}
            />
          ),
        },
      ], visibleWhen),
    },
    {
      id: 'tuzel_kisi_irtibat_noktalari',
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
