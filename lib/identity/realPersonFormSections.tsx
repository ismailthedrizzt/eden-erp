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
  { value: 'erkek', label: 'Erkek' },
  { value: 'kadin', label: 'Kadın' },
]

const militaryOptions = [
  { value: 'muaf', label: 'Muaf' },
  { value: 'caginda_degil', label: 'Askerlik Çağında Değil' },
  { value: 'belirsiz', label: 'Belirsiz' },
  { value: 'tecilli', label: 'Tecilli' },
  { value: 'bakaya', label: 'Bakaya' },
]

const maritalOptions = [
  { value: 'bekar', label: 'Bekar' },
  { value: 'evli', label: 'Evli' },
]

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
      name: 'telefonlar',
      label: 'Telefon',
      type: 'list',
      colSpan: 3,
      listConfig: {
        addLabel: 'Telefon Ekle',
        emptyText: 'Telefon eklenmedi.',
        fields: [
          { name: 'etiket', key: 'etiket', label: 'Etiket', type: 'text', placeholder: 'Cep, iş, ev' },
          { name: 'numara', key: 'numara', label: 'Telefon Numarası', type: 'tel', required: true, placeholder: '+90 5XX XXX XX XX' },
        ],
      },
    },
    {
      name: 'epostalar',
      label: 'E-posta',
      type: 'list',
      colSpan: 3,
      listConfig: {
        addLabel: 'E-posta Ekle',
        emptyText: 'E-posta eklenmedi.',
        fields: [
          { name: 'etiket', key: 'etiket', label: 'Etiket', type: 'text', placeholder: 'Kişisel, iş' },
          { name: 'adres', key: 'adres', label: 'E-posta Adresi', type: 'email', required: true },
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
      { name: 'acil_kisi_ad', label: 'Adı', errorLabel: 'Acil Kişi Adı', type: 'text', requiredGroup: 'acil_kisi' },
      { name: 'acil_kisi_soyad', label: 'Soyadı', errorLabel: 'Acil Kişi Soyadı', type: 'text', requiredGroup: 'acil_kisi' },
      { name: 'acil_kisi_yakinlik', label: 'Yakınlık Derecesi', errorLabel: 'Acil Kişi Yakınlık Derecesi', type: 'text', requiredGroup: 'acil_kisi' },
      { name: 'acil_kisi_telefon', label: 'Telefon Numarası', errorLabel: 'Acil Kişi Telefonu', type: 'tel', requiredGroup: 'acil_kisi' },
    )
  }

  return [
    {
      id: 'gercek_kisi_ozel',
      label: 'Özel',
      icon: <UserCircle size={16} />,
      fields: applyVisibleWhen([
        { name: 'engellilik', label: 'Engellilik Durumu', type: 'checkbox', placeholder: 'Engellilik var', compact: true },
        { name: 'engellilik_yuzdesi', label: 'Engellilik Yüzdesi', type: 'number', compact: true, visibleWhen: { field: 'engellilik', operator: 'equals', value: true } },
        { name: 'askerlik_durumu', label: 'Askerlik Durumu', type: 'select', compact: true, options: militaryOptions },
        { name: 'tecil_tarihi', label: 'Tecil Tarihi', type: 'date', compact: true, visibleWhen: { field: 'askerlik_durumu', operator: 'equals', value: 'tecilli' }, requiredWhen: { field: 'askerlik_durumu', operator: 'equals', value: 'tecilli' } },
        { name: 'hukumluluk', label: 'Hükümlülük Durumu', type: 'checkbox', placeholder: 'Hükümlülük var', compact: true },
      ], visibleWhen),
    },
    {
      id: 'gercek_kisi_iletisim',
      label: 'İletişim',
      icon: <Phone size={16} />,
      fields: applyVisibleWhen(contactFields, visibleWhen),
    },
    {
      id: 'gercek_kisi_egitim',
      label: 'Eğitim',
      icon: <GraduationCap size={16} />,
      fields: applyVisibleWhen([
        { name: 'okuryazar_degil', label: 'Okuryazar Değil', type: 'checkbox', placeholder: 'Okuryazar değil' },
        {
          name: 'egitim_okullari',
          label: 'Okullar',
          type: 'list',
          colSpan: 3,
          disabledWhen: { field: 'okuryazar_degil', operator: 'equals', value: true },
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
        { name: 'yabanci_diller', label: 'Yabancı Diller', type: 'list', colSpan: 3, listConfig: {
          addLabel: 'Dil Ekle',
          emptyText: 'Yabancı dil eklenmedi.',
          fields: [
            { name: 'dil', key: 'dil', label: 'Dil', type: 'text', required: true },
            { name: 'seviye', key: 'seviye', label: 'Seviye', type: 'select', required: true, options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(value => ({ value, label: value })) },
            { name: 'belge', key: 'belge', label: 'Belge', type: 'document', colSpan: 2 },
          ],
        } },
        { name: 'sertifikalar', label: 'Kurslar/Sertifikalar', type: 'list', colSpan: 3, listConfig: {
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
      id: 'gercek_kisi_aile',
      label: 'Aile',
      icon: <Heart size={16} />,
      fields: applyVisibleWhen([
        { name: maritalStatusField, label: 'Medeni Durumu', type: 'select', compact: true, options: maritalOptions },
        { name: 'yakinlar', label: 'Yakın Bilgileri', type: 'list', colSpan: 3, listConfig: {
          addLabel: 'Yakın Ekle',
          emptyText: 'Yakın bilgisi eklenmedi.',
          maxItems: 10,
          fields: [
            { name: 'ad_soyad', key: 'ad_soyad', label: 'Adı Soyadı', type: 'text', required: true },
            { name: 'dogum_tarihi', key: 'dogum_tarihi', label: 'Doğum Tarihi', type: 'date' },
            { name: 'akrabalik_bicimi', key: 'akrabalik_bicimi', label: 'Akrabalık Biçimi', type: 'text', required: true },
          ],
        } },
      ], visibleWhen),
    },
    {
      id: 'gercek_kisi_banka',
      label: 'Banka',
      icon: <Landmark size={16} />,
      fields: applyVisibleWhen([
        {
          name: 'entity_bank_accounts',
          label: 'Banka Bilgileri',
          type: 'custom',
          colSpan: 3,
          render: ({ data, readOnly }) => (
            <EntityBankAccountsPanel
              entityKind="person"
              entityId={data.master_record_id || data.person_id}
              masterName={data.full_name || data.display_name || [data.first_name || data.ad, data.last_name || data.soyad].filter(Boolean).join(' ')}
              masterCountry={data.nationality_country || data.country || data.uyruk}
              readOnly={readOnly}
            />
          ),
        },
      ], visibleWhen),
    },
  ]
}
