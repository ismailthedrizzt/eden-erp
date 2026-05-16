import { GraduationCap, Heart, Landmark, Phone, UserCircle } from 'lucide-react'
import type { FormField, FormTab } from '@/components/ui/EntityForm'
import { EntityBankAccountsPanel } from '@/components/ui/EntityBankAccountsPanel'

type FieldCondition = NonNullable<FormField['visibleWhen']>

type RealPersonMasterTabOptions = {
  visibleWhen?: FieldCondition
  addressField?: string
  cityField?: string
  districtField?: string
  maritalStatusField?: string
  ibanField?: string
  includeEmergencyContact?: boolean
}

const genderOptions = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
]

const militaryOptions = [
  { value: 'muaf', label: 'Muaf' },
  { value: 'caginda_degil', label: 'Askerlik Çağında Değcity' },
  { value: 'belirsiz', label: 'Belirsiz' },
  { value: 'tecilli', label: 'Tecilli' },
  { value: 'bakaya', label: 'Bakaya' },
]

const maritalOptions = [
  { value: 'single', label: 'Bekar' },
  { value: 'married', label: 'Evli' },
]

const foreignLanguageOptions = [
  'İngilizce',
  'Almanca',
  'Fransızca',
  'İspanyolca',
  'İtalyanca',
  'Rusça',
  'Arapça',
  'Çince',
  'Japonca',
  'Korece',
  'Farsça',
  'Portekizce',
  'Felemenkçe',
  'Yunanca',
].map(value => ({ value, label: value }))

function applyVisibleWhen(fields: FormField[], visibleWhen?: FieldCondition): FormField[] {
  if (!visibleWhen) return fields
  return fields.map(field => ({
    ...field,
    visibleWhen: field.visibleWhen || visibleWhen,
  }))
}

export function createRealPersonMasterTabs({
  visibleWhen,
  addressField = 'address',
  cityField = 'city',
  districtField = 'district',
  maritalStatusField = 'marital_status',
  ibanField = 'iban',
  includeEmergencyContact = true,
}: RealPersonMasterTabOptions = {}): FormTab[] {
  const contactFields: FormField[] = [
    {
      name: 'phones',
      label: 'Telefon',
      type: 'list',
      colSpan: 3,
      listConfig: {
        addLabel: 'Telefon Ekle',
        emptyText: 'Telefon eklenmedi.',
        fields: [
          { name: 'label', key: 'label', label: 'Etiket', type: 'text', placeholder: 'Cep, iş, ev' },
          { name: 'phone', key: 'phone', label: 'Telefon Numarası', type: 'tel', required: true, placeholder: '+90 5XX XXX XX XX' },
        ],
      },
    },
    {
      name: 'emails',
      label: 'E-posta',
      type: 'list',
      colSpan: 3,
      listConfig: {
        addLabel: 'E-posta Ekle',
        emptyText: 'E-posta eklenmedi.',
        fields: [
          { name: 'label', key: 'label', label: 'Etiket', type: 'text', placeholder: 'Kişisel, iş' },
          { name: 'address', key: 'address', label: 'E-posta Adresi', type: 'email', required: true },
        ],
      },
    },
    { name: addressField, label: 'Ev Adresi', type: 'textarea', colSpan: 2 },
    { name: cityField, label: 'İl', type: 'text', compact: true },
    { name: districtField, label: 'İlçe', type: 'text', compact: true },
  ]

  if (includeEmergencyContact) {
    contactFields.push(
      { name: 'acil_baslik', label: 'Acil Durumda Ulaşılacak Kişi', type: 'section', colSpan: 3 },
      { name: 'emergency_contact_first_name', label: 'Adı', errorLabel: 'Acil Kişi Adı', type: 'text', requiredGroup: 'emergency_contact' },
      { name: 'emergency_contact_last_name', label: 'Soyadı', errorLabel: 'Acil Kişi Soyadı', type: 'text', requiredGroup: 'emergency_contact' },
      { name: 'emergency_contact_relationship', label: 'Yakınlık Derecesi', errorLabel: 'Acil Kişi Yakınlık Derecesi', type: 'text', requiredGroup: 'emergency_contact' },
      { name: 'emergency_contact_phone', label: 'Telefon Numarası', errorLabel: 'Acil Kişi Telefonu', type: 'tel', requiredGroup: 'emergency_contact' },
    )
  }

  return [
    {
      id: 'person_ozel',
      label: 'Özel',
      icon: <UserCircle size={16} />,
      fields: applyVisibleWhen([
        { name: 'has_disability', label: 'Engellilik Durumu', type: 'checkbox', placeholder: 'Engellilik var', compact: true },
        { name: 'disability_percentage', label: 'Engellilik Yüzdesi', type: 'number', compact: true, visibleWhen: { field: 'has_disability', operator: 'equals', value: true } },
        { name: 'military_status', label: 'Askerlik Durumu', type: 'select', compact: true, options: militaryOptions },
        { name: 'deferment_date', label: 'Tecil Tarihi', type: 'date', compact: true, visibleWhen: { field: 'military_status', operator: 'equals', value: 'tecilli' }, requiredWhen: { field: 'military_status', operator: 'equals', value: 'tecilli' } },
        { name: 'has_conviction', label: 'Hükümlülük Durumu', type: 'checkbox', placeholder: 'Hükümlülük var', compact: true },
      ], visibleWhen),
    },
    {
      id: 'person_iletisim',
      label: 'İletişim',
      icon: <Phone size={16} />,
      fields: applyVisibleWhen(contactFields, visibleWhen),
    },
    {
      id: 'person_egitim',
      label: 'Eğitim',
      icon: <GraduationCap size={16} />,
      fields: applyVisibleWhen([
        { name: 'is_illiterate', label: 'Okuryazar Değcity', type: 'checkbox', placeholder: 'Okuryazar değcity' },
        {
          name: 'education_schools',
          label: 'Okullar',
          type: 'list',
          colSpan: 3,
          disabledWhen: { field: 'is_illiterate', operator: 'equals', value: true },
          listConfig: {
            addLabel: 'Okul Ekle',
            emptyText: 'Okul bilgisi eklenmedi.',
            fields: [
              { name: 'okul_adi', key: 'okul_adi', label: 'Okul Adı', type: 'text' },
              { name: 'derece', key: 'derece', label: 'Derecesi', type: 'select', required: true, options: [
                { value: 'ilkokul', label: 'İlkokul' },
                { value: 'ortaokul_ioo', label: 'Ortaokul ya da İ.Ö.O' },
                { value: 'lise_dengi', label: 'Lise veya dengi okullar' },
                { value: 'yuksekokul_fakulte', label: 'Yüksekokul veya fakülte' },
                { value: 'yuksek_lisans', label: 'Yüksek lisans' },
                { value: 'doktora', label: 'Doktora' },
              ] },
              { name: 'bolum', key: 'bolum', label: 'Bölüm', type: 'text' },
              { name: 'mezuniyet_tarihi', key: 'mezuniyet_tarihi', label: 'Bitiş Tarihi', type: 'date', disabledWhen: { field: 'devam_ediyor', operator: 'equals', value: true } },
              { name: 'devam_ediyor', key: 'devam_ediyor', label: 'Devam', type: 'checkbox' },
            ],
          },
        },
        { name: 'foreign_languages', label: 'Yabancı Diller', type: 'list', colSpan: 3, listConfig: {
          addLabel: 'Dil Ekle',
          emptyText: 'Yabancı dil eklenmedi.',
          fields: [
            { name: 'dil', key: 'dil', label: 'Dil', type: 'select', required: true, options: foreignLanguageOptions },
            { name: 'seviye', key: 'seviye', label: 'Seviye', type: 'select', required: true, options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(value => ({ value, label: value })) },
            { name: 'belge', key: 'belge', label: 'Belge', type: 'document', colSpan: 2 },
          ],
        } },
        { name: 'certificates', label: 'Kurslar/Sertifikalar', type: 'list', colSpan: 3, listConfig: {
          addLabel: 'Kurs/Sertifika Ekle',
          emptyText: 'Kurs veya sertifika eklenmedi.',
          fields: [
            { name: 'kurs_adi', key: 'kurs_adi', label: 'Kurs Adı', type: 'text', required: true },
            { name: 'konusu', key: 'konusu', label: 'Konusu', type: 'text', required: true },
            { name: 'veren_kurulus', key: 'veren_kurulus', label: 'Veren Kuruluş', type: 'text', required: true },
            { name: 'belge_tarihi', key: 'belge_tarihi', label: 'Belge Tarihi', type: 'date', required: true },
            { name: 'belge', key: 'belge', label: 'Belge', type: 'document', colSpan: 2 },
          ],
        } },
      ], visibleWhen),
    },
    {
      id: 'person_aile',
      label: 'Aile',
      icon: <Heart size={16} />,
      fields: applyVisibleWhen([
        { name: maritalStatusField, label: 'Medeni Durumu', type: 'select', compact: true, options: maritalOptions },
        { name: 'relatives', label: 'Yakın Bilgileri', type: 'list', colSpan: 3, listConfig: {
          addLabel: 'Yakın Ekle',
          emptyText: 'Yakın bilgisi eklenmedi.',
          maxItems: 10,
          fields: [
            { name: 'full_name', key: 'full_name', label: 'Adı Soyadı', type: 'text', required: true },
            { name: 'birth_date', key: 'birth_date', label: 'Doğum Tarihi', type: 'date' },
            { name: 'relationship', key: 'relationship', label: 'Akrabalık Biçimi', type: 'text', required: true },
          ],
        } },
      ], visibleWhen),
    },
    {
      id: 'person_banka',
      label: 'Banka',
      icon: <Landmark size={16} />,
      fields: applyVisibleWhen([
        {
          name: 'entity_bank_accounts',
          label: 'Banka Bilgileri',
          hideLabel: true,
          type: 'custom',
          colSpan: 3,
          render: ({ value, onChange, data, readOnly }) => (
            <EntityBankAccountsPanel
              entityKind="person"
              entityId={data.master_record_id || data.person_id}
              masterName={data.full_name || data.display_name || [data.first_name, data.last_name].filter(Boolean).join(' ')}
              masterCountry={data.nationality_country || data.country || data.nationality}
              readOnly={readOnly}
              value={Array.isArray(value) ? value : data.entity_bank_accounts}
              onChange={onChange}
            />
          ),
        },
      ], visibleWhen),
    },
  ]
}
