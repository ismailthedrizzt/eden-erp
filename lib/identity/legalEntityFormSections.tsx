import { ContactRound, Phone } from 'lucide-react'
import type { FormField, FormTab } from '@/components/ui/EntityForm'

type FieldCondition = NonNullable<FormField['visibleWhen']>

type LegalEntityMasterTabOptions = {
  visibleWhen?: FieldCondition
  addressField?: string
  cityField?: string
  districtField?: string
  phoneField?: string
  emailField?: string
  websiteField?: string
}

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
  cityField = 'city',
  districtField = 'district',
  phoneField = 'phone',
  emailField = 'email',
  websiteField = 'website',
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
        { name: cityField, label: 'İl', type: 'text', compact: true },
        { name: districtField, label: 'İlçe', type: 'text', compact: true },
        { name: addressField, label: 'Adres', type: 'textarea', colSpan: 3 },
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
