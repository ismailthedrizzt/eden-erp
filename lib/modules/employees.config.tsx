import { Briefcase, FileText, GraduationCap, Heart, Landmark, Phone, UserCircle } from 'lucide-react'
import type { ModuleConfig } from '@/types/module-config'
import type { Personel } from '@/types'
import { COUNTRY_NATIONALITY_OPTIONS, getCountryNationalityLabel } from '@/lib/reference/country-nationalities'
import { EntityBankAccountsPanel } from '@/components/ui/EntityBankAccountsPanel'
import { EmployeeWorkRegimeSummary } from '@/components/ui/EmployeeWorkRegimeSummary'

const foreignLanguageOptions = [
  'Ä°ngilizce',
  'Almanca',
  'FransÄ±zca',
  'Ä°spanyolca',
  'Ä°talyanca',
  'RusÃ§a',
  'ArapÃ§a',
  'Ã‡ince',
  'Japonca',
  'Korece',
  'FarsÃ§a',
  'Portekizce',
  'FelemenkÃ§e',
  'Yunanca',
].map(value => ({ value, label: value }))

export type PersonelTableRow = Personel & {
  fullname: string
  employee_no?: string
  identity_display?: string
  company_name?: string
  unit_name: string
  position_title: string
  work_type?: string
  employment_status?: string
  egitim_durumu?: string
  sgk_status?: string
  __actions?: string
}

export const personelModuleConfig: ModuleConfig<PersonelTableRow> = {
  moduleKey: 'ik.employees',
  title: 'Ã‡alÄ±ÅŸanlarÄ±mÄ±z',
  entity: {
    primaryTable: 'employees',
    primaryKey: 'id',
    displayField: 'fullname',
    apiBasePath: '/api/employees',
    relations: [
      {
        key: 'unit',
        table: 'organization_units',
        foreignKey: 'unit_id',
        type: 'oneToOne',
        label: 'Birim'
      },
      {
        key: 'position',
        table: 'positions',
        foreignKey: 'position_id',
        type: 'oneToOne',
        label: 'Kadro'
      }
    ]
  },
  list: {
    title: 'Ã‡alÄ±ÅŸanlarÄ±mÄ±z',
    storageKey: 'employees-list',
    defaultView: 'list',
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    realtime: false,
    pollingInterval: 30000,
    emptyText: 'HenÃ¼z Ã§alÄ±ÅŸan kaydÄ± bulunmamaktadÄ±r.',
    createEnabled: true,
    exportEnabled: true,
    search: {
      enabled: true,
      fields: ['fullname', 'national_id', 'mobile_phone', 'email']
    },
    columns: [
      { key: 'photo_url', label: 'FotoÄŸraf', type: 'image', visible: true, width: 60, fixedWidth: true, sortable: false, filterable: false, category: 'Kimlik' },
      { key: 'employee_no', label: 'Ã‡alÄ±ÅŸan No', type: 'text', visible: true, width: 120, sortable: true, filterable: true, category: 'Kimlik' },
      { key: 'fullname', label: 'Ad Soyad', type: 'text', visible: true, width: 200, minWidth: 120, sortable: true, filterable: true, category: 'Kimlik' },
      { key: 'identity_display', label: 'TCKN / Pasaport', type: 'text', visible: false, width: 150, sortable: true, filterable: true, category: 'Kimlik' },
      { key: 'nationality', label: 'Uyruk', type: 'enum', visible: false, width: 110, sortable: true, filterable: true, enumOptions: COUNTRY_NATIONALITY_OPTIONS.map(option => option.value), category: 'Kimlik', render: (value) => getCountryNationalityLabel(value) },
      { key: 'company_name', label: 'Åirket', type: 'text', visible: true, width: 180, sortable: true, filterable: true, category: 'Ä°ÅŸ' },
      { key: 'unit_name', label: 'Departman / Birim', type: 'text', visible: true, width: 170, sortable: true, filterable: true, category: 'Ä°ÅŸ' },
      { key: 'position_title', label: 'Pozisyon / Ãœnvan', type: 'text', visible: true, width: 170, sortable: true, filterable: true, category: 'Ä°ÅŸ' },
      { key: 'sgk_entry_date', label: 'Ä°ÅŸe GiriÅŸ Tarihi', type: 'date', visible: true, width: 140, sortable: true, filterable: true, category: 'Ä°ÅŸ', render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-' },
      { key: 'work_type', label: 'Ã‡alÄ±ÅŸma Tipi', type: 'text', visible: false, width: 130, sortable: true, filterable: true, category: 'Ä°ÅŸ' },
      { key: 'employment_status', label: 'Ä°stihdam Durumu', type: 'enum', visible: true, width: 150, sortable: true, filterable: true, enumOptions: ['active', 'on_leave', 'terminated', 'suspended'], category: 'Ä°ÅŸ' },
      { key: 'mobile_phone', label: 'Telefon', type: 'text', visible: false, width: 130, sortable: false, filterable: true, category: 'Ä°letiÅŸim' },
      { key: 'email', label: 'E-posta', type: 'text', visible: false, width: 200, sortable: true, filterable: true, category: 'Ä°letiÅŸim' },
      { key: 'gender', label: 'Cinsiyet', type: 'enum', visible: false, width: 100, sortable: true, filterable: true, enumOptions: ['male', 'female'], category: 'KiÅŸisel' },
      { key: 'birth_date', label: 'DoÄŸum Tarihi', type: 'date', visible: false, width: 130, sortable: true, filterable: true, category: 'KiÅŸisel', render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-' },
      { key: 'egitim_durumu', label: 'EÄŸitim Durumu', type: 'text', visible: false, width: 150, sortable: true, filterable: true, category: 'EÄŸitim Durumu' },
      { key: 'sgk_status', label: 'SGK Durumu', type: 'text', visible: false, width: 130, sortable: true, filterable: true, category: 'Ä°ÅŸ' },
      {
        key: 'work_status',
        label: 'Durum',
        type: 'enum',
        visible: true,
        width: 110,
        sortable: true,
        filterable: true,
        enumOptions: ['active', 'on_leave', 'terminated', 'suspended'],
        category: 'Durum',
        render: (value) => {
          const colors: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            on_leave: 'bg-yellow-100 text-yellow-800',
            terminated: 'bg-red-100 text-red-800',
            suspended: 'bg-gray-100 text-gray-800'
          }
          const labels: Record<string, string> = {
            active: 'GÃ¶revde',
            on_leave: 'Ä°zinde',
            terminated: 'AyrÄ±lmÄ±ÅŸ',
            suspended: 'AskÄ±da'
          }
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
              {labels[value] || value || '-'}
            </span>
          )
        }
      },
      { key: 'updated_at', label: 'Son GÃ¼ncelleme', type: 'date', visible: false, width: 150, sortable: true, filterable: true, category: 'Durum', render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-' },
      { key: '__actions', label: 'Ä°ÅŸlemler', type: 'actions', visible: true, width: 80, fixed: true, hideable: false, sortable: false, filterable: false, category: 'Genel' }
    ]
  },
  form: {
    mode: 'standard',
    entityName: 'Ã‡alÄ±ÅŸanlar',
    entityNameSingular: 'Ã‡alÄ±ÅŸan',
    identityGate: {
      enabled: true,
      allowedEntityKinds: ['person'],
      masterTable: 'persons',
      uniqueFields: {
        person: ['nationality', 'national_id', 'passport_no'],
      },
      roleTable: 'employees',
      roleDuplicateCheck: 'company_id + person_id + active',
      roleScopeFields: ['company_id', 'company_id'],
    },
    hero: {
      mediaSlots: [
        { key: 'photo', label: 'FotoÄŸraf', type: 'image', required: false },
        { key: 'cv', label: 'CV', type: 'document', required: false }
      ],
      fields: [
        { key: 'first_name', label: 'AdÄ±', type: 'text', required: true },
        { key: 'last_name', label: 'SoyadÄ±', type: 'text', required: true },
        {
          key: 'gender',
          label: 'Cinsiyeti',
          type: 'select',
          required: true,
          compact: true,
          options: [
            { value: 'male', label: 'Erkek' },
            { value: 'female', label: 'KadÄ±n' }
          ]
        },
        { key: 'birth_date', label: 'DoÄŸum Tarihi', type: 'date', compact: true },
        { key: 'birth_place', label: 'DoÄŸum Yeri', type: 'text' },
        { key: 'job_title', label: 'MesleÄŸi', type: 'text' },
        {
          key: 'military_status',
          label: 'Askerlik Durumu',
          type: 'select',
          compact: true,
          visibleWhen: { field: 'gender', includes: ['male', 'Erkek'] },
          options: [
            { value: 'muaf', label: 'Muaf' },
            { value: 'caginda_degil', label: 'Askerlik Ã‡aÄŸÄ±nda DeÄŸcity' },
            { value: 'belirsiz', label: 'Belirsiz' },
            { value: 'tecilli', label: 'Tecilli' },
            { value: 'bakaya', label: 'Bakaya' }
          ]
        },
        {
          key: 'blood_type',
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
        label: 'Ã–zel',
        icon: <UserCircle size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'has_disability', label: 'Engellilik Durumu', type: 'checkbox', placeholder: 'Engellilik var', compact: true },
            { key: 'disability_percentage', label: 'Engellilik YÃ¼zdesi', type: 'number', compact: true, visibleWhen: { field: 'has_disability', operator: 'equals', value: true } },
            {
              key: 'military_status',
              label: 'Askerlik Durumu',
              type: 'select',
              compact: true,
              visibleWhen: { field: 'gender', includes: ['male', 'Erkek'] },
              options: [
                { value: 'muaf', label: 'Muaf' },
                { value: 'caginda_degil', label: 'Askerlik Ã‡aÄŸÄ±nda DeÄŸcity' },
                { value: 'belirsiz', label: 'Belirsiz' },
                { value: 'tecilli', label: 'Tecilli' },
                { value: 'bakaya', label: 'Bakaya' }
              ]
            },
            { key: 'deferment_date', label: 'Tecil Tarihi', type: 'date', compact: true, visibleWhen: { field: 'military_status', operator: 'equals', value: 'tecilli' }, requiredWhen: { field: 'military_status', operator: 'equals', value: 'tecilli' } },
            { key: 'has_conviction', label: 'HÃ¼kÃ¼mlÃ¼lÃ¼k Durumu', type: 'checkbox', placeholder: 'HÃ¼kÃ¼mlÃ¼lÃ¼k var', compact: true }
          ]
        }
      },
      {
        key: 'iletisim',
        label: 'Ä°letiÅŸim',
        icon: <Phone size={16} />,
        source: {
          type: 'fields',
          fields: [
            {
              key: 'phones',
              label: 'Telefon',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'Telefon Ekle',
                emptyText: 'Telefon eklenmedi.',
                fields: [
                  { name: 'label', key: 'label', label: 'Etiket', type: 'text', placeholder: 'Cep, iÅŸ, ev' },
                  { name: 'phone', key: 'phone', label: 'Telefon NumarasÄ±', type: 'tel', required: true, placeholder: '+90 5XX XXX XX XX' }
                ]
              }
            },
            {
              key: 'emails',
              label: 'E-posta',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'E-posta Ekle',
                emptyText: 'E-posta eklenmedi.',
                fields: [
                  { name: 'label', key: 'label', label: 'Etiket', type: 'text', placeholder: 'KiÅŸisel, iÅŸ' },
                  { name: 'address', key: 'address', label: 'E-posta Adresi', type: 'email', required: true }
                ]
              }
            },
            { key: 'address', label: 'Ev Adresi', type: 'textarea', colSpan: 2 },
            { key: 'city', label: 'Ä°l', type: 'text', compact: true },
            { key: 'district', label: 'Ä°lÃ§e', type: 'text', compact: true },
            { key: 'acil_baslik', label: 'Acil Durumda UlaÅŸÄ±lacak KiÅŸi', type: 'section', colSpan: 3 },
            { key: 'emergency_contact_first_name', label: 'AdÄ±', errorLabel: 'Acil KiÅŸi AdÄ±', type: 'text', requiredGroup: 'emergency_contact' },
            { key: 'emergency_contact_last_name', label: 'SoyadÄ±', errorLabel: 'Acil KiÅŸi SoyadÄ±', type: 'text', requiredGroup: 'emergency_contact' },
            { key: 'emergency_contact_relationship', label: 'YakÄ±nlÄ±k Derecesi', errorLabel: 'Acil KiÅŸi YakÄ±nlÄ±k Derecesi', type: 'text', requiredGroup: 'emergency_contact' },
            { key: 'emergency_contact_phone', label: 'Telefon NumarasÄ±', errorLabel: 'Acil KiÅŸi Telefonu', type: 'tel', requiredGroup: 'emergency_contact' }
          ]
        }
      },
      {
        key: 'egitim',
        label: 'EÄŸitim',
        icon: <GraduationCap size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'is_illiterate', label: 'Okuryazar DeÄŸcity', type: 'checkbox', placeholder: 'Okuryazar deÄŸcity' },
            {
              key: 'education_schools',
              label: 'Okullar',
              type: 'list',
              colSpan: 3,
              disabledWhen: { field: 'is_illiterate', operator: 'equals', value: true },
              listConfig: {
                addLabel: 'Okul Ekle',
                emptyText: 'Okul bilgisi eklenmedi.',
                fields: [
                  { name: 'okul_adi', key: 'okul_adi', label: 'Okul AdÄ±', type: 'text' },
                  {
                    name: 'derece',
                    key: 'derece',
                    label: 'Derecesi',
                    type: 'select',
                    required: true,
                    options: [
                      { value: 'ilkokul', label: 'Ä°lkokul' },
                      { value: 'ortaokul_ioo', label: 'Ortaokul ya da Ä°.Ã–.O' },
                      { value: 'lise_dengi', label: 'Lise veya dengi okullar' },
                      { value: 'yuksekokul_fakulte', label: 'YÃ¼ksekokul veya fakÃ¼lte' },
                      { value: 'yuksek_lisans', label: 'YÃ¼ksek lisans' },
                      { value: 'doktora', label: 'Doktora' }
                    ]
                  },
                  { name: 'bolum', key: 'bolum', label: 'BÃ¶lÃ¼m', type: 'text' },
                  { name: 'mezuniyet_tarihi', key: 'mezuniyet_tarihi', label: 'BitiÅŸ Tarihi', type: 'date', disabledWhen: { field: 'devam_ediyor', operator: 'equals', value: true } },
                  { name: 'devam_ediyor', key: 'devam_ediyor', label: 'Devam', type: 'checkbox' }
                ]
              }
            },
            {
              key: 'foreign_languages',
              label: 'YabancÄ± Diller',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'Dil Ekle',
                emptyText: 'YabancÄ± dil eklenmedi.',
                fields: [
                  { name: 'dil', key: 'dil', label: 'Dil', type: 'select', required: true, options: foreignLanguageOptions },
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
              key: 'certificates',
              label: 'Kurslar/Sertifikalar',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'Kurs/Sertifika Ekle',
                emptyText: 'Kurs veya sertifika eklenmedi.',
                fields: [
                  { name: 'kurs_adi', key: 'kurs_adi', label: 'Kurs AdÄ±', type: 'text', required: true },
                  { name: 'konusu', key: 'konusu', label: 'Konusu', type: 'text', required: true },
                  { name: 'veren_kurulus', key: 'veren_kurulus', label: 'Veren KuruluÅŸ', type: 'text', required: true },
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
              key: 'marital_status',
              label: 'Medeni Durumu',
              type: 'select',
              compact: true,
              options: [
                { value: 'single', label: 'Bekar' },
                { value: 'married', label: 'Evli' }
              ]
            },
            {
              key: 'relatives',
              label: 'YakÄ±n Bilgileri',
              type: 'list',
              colSpan: 3,
              listConfig: {
                addLabel: 'YakÄ±n Ekle',
                emptyText: 'YakÄ±n bilgisi eklenmedi.',
                maxItems: 10,
                fields: [
                  { name: 'full_name', key: 'full_name', label: 'AdÄ± SoyadÄ±', type: 'text', required: true },
                  { name: 'birth_date', key: 'birth_date', label: 'DoÄŸum Tarihi', type: 'date' },
                  { name: 'relationship', key: 'relationship', label: 'AkrabalÄ±k BiÃ§imi', type: 'text', required: true }
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
                  masterName={data.full_name || [data.first_name, data.last_name].filter(Boolean).join(' ')}
                  masterCountry={data.nationality_country || data.nationality}
                  readOnly={readOnly}
                />
              ),
            }
          ]
        }
      },
      {
        key: 'calisma',
        label: 'Ä°ÅŸ',
        icon: <Briefcase size={16} />,
        source: {
          type: 'fields',
          fields: [
            {
              key: 'work_regime_summary',
              label: 'Ã‡alÄ±ÅŸma Rejimi Ã–zeti',
              type: 'custom',
              colSpan: 3,
              render: ({ data }) => <EmployeeWorkRegimeSummary data={data} />
            }
          ]
        }
      },
      {
        key: 'kiyafet',
        label: 'KÄ±yafet',
        icon: <UserCircle size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'top_size', label: 'Ãœst Beden', type: 'text', compact: true },
            { key: 'bottom_size', label: 'Alt Beden', type: 'text', compact: true },
            { key: 'shoe_size', label: 'AyakkabÄ±', type: 'text', compact: true },
            { key: 'kep', label: 'Kep', type: 'text', compact: true }
          ]
        }
      },
      {
        key: 'notes',
        label: 'Notlar',
        icon: <FileText size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 }
          ]
        }
      }
    ],
    actions: [
      { key: 'cancel', label: 'Ä°ptal', variant: 'secondary' },
      { key: 'save', label: 'Kaydet', variant: 'primary' }
    ],
    lifecycle: {
      saveMode: 'approvalAware',
      messages: {
        createSuccess: 'Ã‡alÄ±ÅŸan kaydÄ± oluÅŸturuldu',
        updateSuccess: 'Ã‡alÄ±ÅŸan bilgileri gÃ¼ncellendi',
        deleteSuccess: 'Ã‡alÄ±ÅŸan kaydÄ± silindi'
      },
      approval: {
        enabled: false,
        workflowKey: 'ik.employees',
        interceptActions: ['create', 'update', 'delete']
      }
    }
  },
  permissions: {
    view: 'ik.employees.view',
    create: 'ik.employees.create',
    update: 'ik.employees.update',
    delete: 'ik.employees.delete'
  },
  workflows: {
    enabled: false,
    workflowKey: 'ik.employees'
  }
}
