import { Briefcase, FileText, GraduationCap, Heart, Landmark, Phone, UserCircle } from 'lucide-react'
import type { ModuleConfig } from '@/types/module-config'
import type { Personel } from '@/types'
import { COUNTRY_NATIONALITY_OPTIONS, getCountryNationalityLabel } from '@/lib/reference/country-nationalities'
import { EntityBankAccountsPanel } from '@/components/ui/EntityBankAccountsPanel'
import { EmployeeWorkRegimeSummary } from '@/components/ui/EmployeeWorkRegimeSummary'

export type PersonelTableRow = Personel & {
  fullname: string
  employee_no?: string
  identity_display?: string
  sirket_adi?: string
  birim_adi: string
  kadro_unvani: string
  calisma_tipi?: string
  employment_status?: string
  egitim_durumu?: string
  sgk_status?: string
  __actions?: string
}

export const personelModuleConfig: ModuleConfig<PersonelTableRow> = {
  moduleKey: 'ik.personel',
  title: 'Çalışanlarımız',
  entity: {
    primaryTable: 'employees',
    primaryKey: 'id',
    displayField: 'fullname',
    apiBasePath: '/api/ik/personel',
    relations: [
      {
        key: 'birim',
        table: 'birimler',
        foreignKey: 'birim_id',
        type: 'oneToOne',
        label: 'Birim'
      },
      {
        key: 'kadro',
        table: 'norm_kadrolar',
        foreignKey: 'kadro_id',
        type: 'oneToOne',
        label: 'Kadro'
      }
    ]
  },
  list: {
    title: 'Çalışanlarımız',
    storageKey: 'employees-list',
    defaultView: 'list',
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    realtime: false,
    pollingInterval: 30000,
    emptyText: 'Henüz çalışan kaydı bulunmamaktadır.',
    createEnabled: true,
    exportEnabled: true,
    search: {
      enabled: true,
      fields: ['fullname', 'tc_kimlik', 'cep_telefonu', 'email']
    },
    columns: [
      { key: 'fotograf_url', label: 'Fotoğraf', type: 'image', visible: true, width: 60, fixedWidth: true, sortable: false, filterable: false, category: 'Kimlik' },
      { key: 'employee_no', label: 'Çalışan No', type: 'text', visible: true, width: 120, sortable: true, filterable: true, category: 'Kimlik' },
      { key: 'fullname', label: 'Ad Soyad', type: 'text', visible: true, width: 200, minWidth: 120, sortable: true, filterable: true, category: 'Kimlik' },
      { key: 'identity_display', label: 'TCKN / Pasaport', type: 'text', visible: false, width: 150, sortable: true, filterable: true, category: 'Kimlik' },
      { key: 'uyruk', label: 'Uyruk', type: 'enum', visible: false, width: 110, sortable: true, filterable: true, enumOptions: COUNTRY_NATIONALITY_OPTIONS.map(option => option.value), category: 'Kimlik', render: (value) => getCountryNationalityLabel(value) },
      { key: 'sirket_adi', label: 'Şirket', type: 'text', visible: true, width: 180, sortable: true, filterable: true, category: 'İş' },
      { key: 'birim_adi', label: 'Departman / Birim', type: 'text', visible: true, width: 170, sortable: true, filterable: true, category: 'İş' },
      { key: 'kadro_unvani', label: 'Pozisyon / Ünvan', type: 'text', visible: true, width: 170, sortable: true, filterable: true, category: 'İş' },
      { key: 'sgk_giris', label: 'İşe Giriş Tarihi', type: 'date', visible: true, width: 140, sortable: true, filterable: true, category: 'İş', render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-' },
      { key: 'calisma_tipi', label: 'Çalışma Tipi', type: 'text', visible: false, width: 130, sortable: true, filterable: true, category: 'İş' },
      { key: 'employment_status', label: 'İstihdam Durumu', type: 'enum', visible: true, width: 150, sortable: true, filterable: true, enumOptions: ['gorevde', 'izinde', 'ayrilmis', 'askida'], category: 'İş' },
      { key: 'cep_telefonu', label: 'Telefon', type: 'text', visible: false, width: 130, sortable: false, filterable: true, category: 'İletişim' },
      { key: 'email', label: 'E-posta', type: 'text', visible: false, width: 200, sortable: true, filterable: true, category: 'İletişim' },
      { key: 'cinsiyet', label: 'Cinsiyet', type: 'enum', visible: false, width: 100, sortable: true, filterable: true, enumOptions: ['erkek', 'kadin'], category: 'Kişisel' },
      { key: 'dogum_tarihi', label: 'Doğum Tarihi', type: 'date', visible: false, width: 130, sortable: true, filterable: true, category: 'Kişisel', render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-' },
      { key: 'egitim_durumu', label: 'Eğitim Durumu', type: 'text', visible: false, width: 150, sortable: true, filterable: true, category: 'Eğitim Durumu' },
      { key: 'sgk_status', label: 'SGK Durumu', type: 'text', visible: false, width: 130, sortable: true, filterable: true, category: 'İş' },
      {
        key: 'calisma_durumu',
        label: 'Durum',
        type: 'enum',
        visible: true,
        width: 110,
        sortable: true,
        filterable: true,
        enumOptions: ['gorevde', 'izinde', 'ayrilmis', 'askida'],
        category: 'Durum',
        render: (value) => {
          const colors: Record<string, string> = {
            gorevde: 'bg-green-100 text-green-800',
            izinde: 'bg-yellow-100 text-yellow-800',
            ayrilmis: 'bg-red-100 text-red-800',
            askida: 'bg-gray-100 text-gray-800'
          }
          const labels: Record<string, string> = {
            gorevde: 'Görevde',
            izinde: 'İzinde',
            ayrilmis: 'Ayrılmış',
            askida: 'Askıda'
          }
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
              {labels[value] || value || '-'}
            </span>
          )
        }
      },
      { key: 'updated_at', label: 'Son Güncelleme', type: 'date', visible: false, width: 150, sortable: true, filterable: true, category: 'Durum', render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-' },
      { key: '__actions', label: 'İşlemler', type: 'actions', visible: true, width: 80, fixed: true, hideable: false, sortable: false, filterable: false, category: 'Genel' }
    ]
  },
  form: {
    mode: 'standard',
    entityName: 'Çalışanlar',
    entityNameSingular: 'Çalışan',
    identityGate: {
      enabled: true,
      allowedEntityKinds: ['person'],
      masterTable: 'persons',
      uniqueFields: {
        person: ['nationality', 'national_id', 'passport_no'],
      },
      roleTable: 'employees',
      roleDuplicateCheck: 'company_id + person_id + active',
      roleScopeFields: ['company_id', 'sirket_id'],
    },
    hero: {
      mediaSlots: [
        { key: 'photo', label: 'Fotoğraf', type: 'image', required: false },
        { key: 'cv', label: 'CV', type: 'document', required: false }
      ],
      fields: [
        { key: 'ad', label: 'Adı', type: 'text', required: true },
        { key: 'soyad', label: 'Soyadı', type: 'text', required: true },
        {
          key: 'cinsiyet',
          label: 'Cinsiyeti',
          type: 'select',
          required: true,
          compact: true,
          options: [
            { value: 'erkek', label: 'Erkek' },
            { value: 'kadin', label: 'Kadın' }
          ]
        },
        { key: 'dogum_tarihi', label: 'Doğum Tarihi', type: 'date', compact: true },
        { key: 'dogum_yeri', label: 'Doğum Yeri', type: 'text' },
        { key: 'gorev', label: 'Mesleği', type: 'text' },
        {
          key: 'askerlik_durumu',
          label: 'Askerlik Durumu',
          type: 'select',
          compact: true,
          visibleWhen: { field: 'cinsiyet', includes: ['erkek', 'Erkek'] },
          options: [
            { value: 'muaf', label: 'Muaf' },
            { value: 'caginda_degil', label: 'Askerlik Çağında Değil' },
            { value: 'belirsiz', label: 'Belirsiz' },
            { value: 'tecilli', label: 'Tecilli' },
            { value: 'bakaya', label: 'Bakaya' }
          ]
        },
        {
          key: 'kan_grubu',
          label: 'Kan Grubu',
          type: 'select',
          compact: true,
          options: [
            { value: 'A+', label: 'A+' },
            { value: 'A-', label: 'A-' },
            { value: 'B+', label: 'B+' },
            { value: 'B-', label: 'B-' },
            { value: 'AB+', label: 'AB+' },
            { value: 'AB-', label: 'AB-' },
            { value: '0+', label: '0+' },
            { value: '0-', label: '0-' }
          ]
        },
      ]
    },
    tabs: [
      {
        key: 'ozel',
        label: 'Özel',
        icon: <UserCircle size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'engellilik', label: 'Engellilik Durumu', type: 'checkbox', placeholder: 'Engellilik var', compact: true },
            { key: 'engellilik_yuzdesi', label: 'Engellilik Yüzdesi', type: 'number', compact: true, visibleWhen: { field: 'engellilik', operator: 'equals', value: true } },
            {
              key: 'askerlik_durumu',
              label: 'Askerlik Durumu',
              type: 'select',
              compact: true,
              visibleWhen: { field: 'cinsiyet', includes: ['erkek', 'Erkek'] },
              options: [
                { value: 'muaf', label: 'Muaf' },
                { value: 'caginda_degil', label: 'Askerlik Çağında Değil' },
                { value: 'belirsiz', label: 'Belirsiz' },
                { value: 'tecilli', label: 'Tecilli' },
                { value: 'bakaya', label: 'Bakaya' }
              ]
            },
            { key: 'tecil_tarihi', label: 'Tecil Tarihi', type: 'date', compact: true, visibleWhen: { field: 'askerlik_durumu', operator: 'equals', value: 'tecilli' }, requiredWhen: { field: 'askerlik_durumu', operator: 'equals', value: 'tecilli' } },
            { key: 'hukumluluk', label: 'Hükümlülük Durumu', type: 'checkbox', placeholder: 'Hükümlülük var', compact: true }
          ]
        }
      },
      {
        key: 'iletisim',
        label: 'İletişim',
        icon: <Phone size={16} />,
        source: {
          type: 'fields',
          fields: [
            {
              key: 'telefonlar',
              label: 'Telefon',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'Telefon Ekle',
                emptyText: 'Telefon eklenmedi.',
                fields: [
                  { name: 'etiket', key: 'etiket', label: 'Etiket', type: 'text', placeholder: 'Cep, iş, ev' },
                  { name: 'numara', key: 'numara', label: 'Telefon Numarası', type: 'tel', required: true, placeholder: '+90 5XX XXX XX XX' }
                ]
              }
            },
            {
              key: 'epostalar',
              label: 'E-posta',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'E-posta Ekle',
                emptyText: 'E-posta eklenmedi.',
                fields: [
                  { name: 'etiket', key: 'etiket', label: 'Etiket', type: 'text', placeholder: 'Kişisel, iş' },
                  { name: 'adres', key: 'adres', label: 'E-posta Adresi', type: 'email', required: true }
                ]
              }
            },
            { key: 'adres', label: 'Ev Adresi', type: 'textarea', colSpan: 2 },
            { key: 'il', label: 'İl', type: 'text', compact: true },
            { key: 'ilce', label: 'İlçe', type: 'text', compact: true },
            { key: 'acil_baslik', label: 'Acil Durumda Ulaşılacak Kişi', type: 'section', colSpan: 3 },
            { key: 'acil_kisi_ad', label: 'Adı', errorLabel: 'Acil Kişi Adı', type: 'text', requiredGroup: 'acil_kisi' },
            { key: 'acil_kisi_soyad', label: 'Soyadı', errorLabel: 'Acil Kişi Soyadı', type: 'text', requiredGroup: 'acil_kisi' },
            { key: 'acil_kisi_yakinlik', label: 'Yakınlık Derecesi', errorLabel: 'Acil Kişi Yakınlık Derecesi', type: 'text', requiredGroup: 'acil_kisi' },
            { key: 'acil_kisi_telefon', label: 'Telefon Numarası', errorLabel: 'Acil Kişi Telefonu', type: 'tel', requiredGroup: 'acil_kisi' }
          ]
        }
      },
      {
        key: 'egitim',
        label: 'Eğitim',
        icon: <GraduationCap size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'okuryazar_degil', label: 'Okuryazar Değil', type: 'checkbox', placeholder: 'Okuryazar değil' },
            {
              key: 'egitim_okullari',
              label: 'Okullar',
              type: 'list',
              colSpan: 3,
              disabledWhen: { field: 'okuryazar_degil', operator: 'equals', value: true },
              listConfig: {
                addLabel: 'Okul Ekle',
                emptyText: 'Okul bilgisi eklenmedi.',
                fields: [
                  { name: 'okul_adi', key: 'okul_adi', label: 'Okul Adı', type: 'text' },
                  {
                    name: 'derece',
                    key: 'derece',
                    label: 'Derecesi',
                    type: 'select',
                    required: true,
                    options: [
                      { value: 'ilkokul', label: 'İlkokul' },
                      { value: 'ortaokul_ioo', label: 'Ortaokul ya da İ.Ö.O' },
                      { value: 'lise_dengi', label: 'Lise veya dengi okullar' },
                      { value: 'yuksekokul_fakulte', label: 'Yüksekokul veya fakülte' },
                      { value: 'yuksek_lisans', label: 'Yüksek lisans' },
                      { value: 'doktora', label: 'Doktora' }
                    ]
                  },
                  { name: 'bolum', key: 'bolum', label: 'Bölüm', type: 'text' },
                  { name: 'mezuniyet_tarihi', key: 'mezuniyet_tarihi', label: 'Bitiş Tarihi', type: 'date', disabledWhen: { field: 'devam_ediyor', operator: 'equals', value: true } },
                  { name: 'devam_ediyor', key: 'devam_ediyor', label: 'Devam', type: 'checkbox' }
                ]
              }
            },
            {
              key: 'yabanci_diller',
              label: 'Yabancı Diller',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'Dil Ekle',
                emptyText: 'Yabancı dil eklenmedi.',
                fields: [
                  { name: 'dil', key: 'dil', label: 'Dil', type: 'text', required: true },
                  {
                    name: 'seviye',
                    key: 'seviye',
                    label: 'Seviye',
                    type: 'select',
                    required: true,
                    options: [
                      { value: 'A1', label: 'A1' },
                      { value: 'A2', label: 'A2' },
                      { value: 'B1', label: 'B1' },
                      { value: 'B2', label: 'B2' },
                      { value: 'C1', label: 'C1' },
                      { value: 'C2', label: 'C2' }
                    ]
                  },
                  { name: 'belge', key: 'belge', label: 'Belge', type: 'document', colSpan: 2 }
                ]
              }
            },
            {
              key: 'sertifikalar',
              label: 'Kurslar/Sertifikalar',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'Kurs/Sertifika Ekle',
                emptyText: 'Kurs veya sertifika eklenmedi.',
                fields: [
                  { name: 'kurs_adi', key: 'kurs_adi', label: 'Kurs Adı', type: 'text', required: true },
                  { name: 'konusu', key: 'konusu', label: 'Konusu', type: 'text', required: true },
                  { name: 'veren_kurulus', key: 'veren_kurulus', label: 'Veren Kuruluş', type: 'text', required: true },
                  { name: 'belge_tarihi', key: 'belge_tarihi', label: 'Belge Tarihi', type: 'date', required: true },
                  { name: 'belge', key: 'belge', label: 'Belge', type: 'document', colSpan: 2 }
                ]
              }
            }
          ]
        }
      },
      {
        key: 'aile',
        label: 'Aile',
        icon: <Heart size={16} />,
        source: {
          type: 'fields',
          fields: [
            {
              key: 'medeni_durum',
              label: 'Medeni Durumu',
              type: 'select',
              compact: true,
              options: [
                { value: 'bekar', label: 'Bekar' },
                { value: 'evli', label: 'Evli' }
              ]
            },
            {
              key: 'yakinlar',
              label: 'Yakın Bilgileri',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'Yakın Ekle',
                emptyText: 'Yakın bilgisi eklenmedi.',
                maxItems: 10,
                fields: [
                  { name: 'ad_soyad', key: 'ad_soyad', label: 'Adı Soyadı', type: 'text', required: true },
                  { name: 'dogum_tarihi', key: 'dogum_tarihi', label: 'Doğum Tarihi', type: 'date' },
                  { name: 'akrabalik_bicimi', key: 'akrabalik_bicimi', label: 'Akrabalık Biçimi', type: 'text', required: true }
                ]
              }
            }
          ]
        }
      },
      {
        key: 'banka',
        label: 'Banka Bilgileri',
        icon: <Landmark size={16} />,
        source: {
          type: 'fields',
          fields: [
            {
              key: 'entity_bank_accounts',
              label: 'Banka Bilgileri',
              hideLabel: true,
              type: 'custom',
              colSpan: 3,
              render: ({ data, readOnly }) => (
                <EntityBankAccountsPanel
                  entityKind="person"
                  entityId={data.master_record_id || data.person_id}
                  masterName={data.full_name || [data.ad, data.soyad].filter(Boolean).join(' ')}
                  masterCountry={data.nationality_country || data.uyruk}
                  readOnly={readOnly}
                />
              ),
            }
          ]
        }
      },
      {
        key: 'calisma',
        label: 'İş',
        icon: <Briefcase size={16} />,
        source: {
          type: 'fields',
          fields: [
            {
              key: 'work_regime_summary',
              label: 'Çalışma Rejimi Özeti',
              type: 'custom',
              colSpan: 3,
              render: ({ data }) => <EmployeeWorkRegimeSummary data={data} />
            }
          ]
        }
      },
      {
        key: 'kiyafet',
        label: 'Kıyafet',
        icon: <UserCircle size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'ust_beden', label: 'Üst Beden', type: 'text', compact: true },
            { key: 'alt_beden', label: 'Alt Beden', type: 'text', compact: true },
            { key: 'ayakkabi', label: 'Ayakkabı', type: 'text', compact: true },
            { key: 'kep', label: 'Kep', type: 'text', compact: true }
          ]
        }
      },
      {
        key: 'notlar',
        label: 'Notlar',
        icon: <FileText size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'notlar', label: 'Notlar', type: 'textarea', colSpan: 3 }
          ]
        }
      }
    ],
    actions: [
      { key: 'cancel', label: 'İptal', variant: 'secondary' },
      { key: 'save', label: 'Kaydet', variant: 'primary' }
    ],
    lifecycle: {
      saveMode: 'approvalAware',
      messages: {
        createSuccess: 'Çalışan kaydı oluşturuldu',
        updateSuccess: 'Çalışan bilgileri güncellendi',
        deleteSuccess: 'Çalışan kaydı silindi'
      },
      approval: {
        enabled: false,
        workflowKey: 'ik.personel',
        interceptActions: ['create', 'update', 'delete']
      }
    }
  },
  permissions: {
    view: 'ik.personel.view',
    create: 'ik.personel.create',
    update: 'ik.personel.update',
    delete: 'ik.personel.delete'
  },
  workflows: {
    enabled: false,
    workflowKey: 'ik.personel'
  }
}
