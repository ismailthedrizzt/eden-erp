import { Briefcase, FileText, Phone, UserCircle } from 'lucide-react'
import type { ModuleConfig } from '@/types/module-config'
import type { Personel } from '@/types'

export type PersonelTableRow = Personel & {
  fullname: string
  birim_adi: string
  kadro_unvani: string
}

export const personelModuleConfig: ModuleConfig<PersonelTableRow> = {
  moduleKey: 'ik.personel',
  title: 'Çalışanlar',
  entity: {
    primaryTable: 'personel',
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
    title: 'Çalışanlar',
    storageKey: 'personel-list',
    defaultView: 'list',
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    realtime: true,
    pollingInterval: 30000,
    emptyText: 'Henüz personel kaydı bulunmamaktadır.',
    createEnabled: true,
    exportEnabled: true,
    search: {
      enabled: true,
      fields: ['fullname', 'tc_kimlik', 'cep_telefonu', 'email']
    },
    columns: [
      {
        key: 'fotograf_url',
        label: 'Fotoğraf',
        type: 'image',
        required: true,
        visible: true,
        width: 60,
        fixedWidth: true,
        sortable: false,
        filterable: false,
        category: 'Kişisel'
      },
      {
        key: 'fullname',
        label: 'Adı Soyadı',
        type: 'text',
        required: true,
        visible: true,
        width: 200,
        minWidth: 120,
        sortable: true,
        filterable: true,
        category: 'Kişisel'
      },
      {
        key: 'tc_kimlik',
        label: 'TC Kimlik',
        type: 'text',
        required: true,
        visible: true,
        width: 120,
        sortable: true,
        filterable: true,
        category: 'Kişisel'
      },
      {
        key: 'uyruk',
        label: 'Uyruk',
        type: 'enum',
        required: true,
        visible: true,
        width: 100,
        sortable: true,
        filterable: true,
        enumOptions: ['Türk', 'Yabancı', 'TC', 'YUNAN', 'ALMAN', 'AMERİKALI'],
        category: 'Kişisel'
      },
      {
        key: 'cinsiyet',
        label: 'Cinsiyet',
        type: 'enum',
        required: true,
        visible: true,
        width: 100,
        sortable: true,
        filterable: true,
        enumOptions: ['Erkek', 'Kadın'],
        category: 'Kişisel'
      },
      {
        key: 'dogum_tarihi',
        label: 'Doğum Tarihi',
        type: 'date',
        width: 130,
        sortable: true,
        filterable: true,
        category: 'Kişisel',
        render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-'
      },
      {
        key: 'cep_telefonu',
        label: 'Telefon',
        type: 'text',
        width: 130,
        sortable: false,
        filterable: true,
        category: 'İletişim'
      },
      {
        key: 'email',
        label: 'E-posta',
        type: 'text',
        width: 200,
        sortable: true,
        filterable: true,
        category: 'İletişim'
      },
      {
        key: 'calisma_durumu',
        label: 'Durum',
        type: 'enum',
        width: 110,
        sortable: true,
        filterable: true,
        enumOptions: ['gorevde', 'izinde', 'ayrilmis'],
        render: (value) => {
          const colors: Record<string, string> = {
            gorevde: 'bg-green-100 text-green-800',
            izinde: 'bg-yellow-100 text-yellow-800',
            ayrilmis: 'bg-red-100 text-red-800'
          }
          const labels: Record<string, string> = {
            gorevde: 'Görevde',
            izinde: 'İzinde',
            ayrilmis: 'Ayrılmış'
          }
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
              {labels[value] || value}
            </span>
          )
        }
      },
      {
        key: 'sgk_giris',
        label: 'SGK Giriş',
        type: 'date',
        width: 130,
        sortable: true,
        filterable: true,
        render: (value) => value ? new Date(value).toLocaleDateString('tr-TR') : '-'
      }
    ]
  },
  form: {
    mode: 'standard',
    entityName: 'Personel',
    entityNameSingular: 'Personel',
    hero: {
      mediaSlots: [
        { key: 'photo', label: 'Fotoğraf', type: 'image', required: false },
        { key: 'cv', label: 'CV', type: 'document', required: false }
      ],
      fields: [
        { key: 'ad', label: 'Ad', type: 'text', required: true },
        { key: 'soyad', label: 'Soyad', type: 'text', required: true },
        { key: 'tc_kimlik', label: 'TC Kimlik', type: 'text' },
        {
          key: 'uyruk',
          label: 'Uyruk',
          type: 'select',
          options: [
            { value: 'tc', label: 'T.C.' },
            { value: 'yabanci', label: 'Yabancı' }
          ]
        },
        {
          key: 'cinsiyet',
          label: 'Cinsiyet',
          type: 'select',
          options: [
            { value: '', label: 'Seçiniz' },
            { value: 'erkek', label: 'Erkek' },
            { value: 'kadin', label: 'Kadın' }
          ]
        },
        { key: 'dogum_tarihi', label: 'Doğum Tarihi', type: 'date' },
        { key: 'dogum_yeri', label: 'Doğum Yeri', type: 'text' },
        {
          key: 'kan_grubu',
          label: 'Kan Grubu',
          type: 'select',
          options: [
            { value: '', label: 'Seçiniz' },
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
        {
          key: 'medeni_durum',
          label: 'Medeni Durum',
          type: 'select',
          options: [
            { value: '', label: 'Seçiniz' },
            { value: 'bekar', label: 'Bekar' },
            { value: 'evli', label: 'Evli' },
            { value: 'dul', label: 'Dul' },
            { value: 'bosanmis', label: 'Boşanmış' }
          ]
        }
      ]
    },
    tabs: [
      {
        key: 'iletisim',
        label: 'İletişim',
        icon: <Phone size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'cep_telefonu', label: 'Cep Telefonu', type: 'tel' },
            { key: 'is_telefonu', label: 'İş Telefonu', type: 'tel' },
            { key: 'email', label: 'E-posta', type: 'email' },
            { key: 'adres', label: 'Adres', type: 'textarea', colSpan: 2 },
            { key: 'il', label: 'İl', type: 'text' },
            { key: 'ilce', label: 'İlçe', type: 'text' }
          ]
        }
      },
      {
        key: 'acil',
        label: 'Acil Durum',
        icon: <UserCircle size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'acil_kisi_ad', label: 'Acil Kişi Adı', type: 'text' },
            { key: 'acil_kisi_soyad', label: 'Acil Kişi Soyadı', type: 'text' },
            { key: 'acil_kisi_yakinlik', label: 'Yakınlık Derecesi', type: 'text' },
            { key: 'acil_kisi_telefon', label: 'Acil Telefon', type: 'tel' }
          ]
        }
      },
      {
        key: 'calisma',
        label: 'Çalışma',
        icon: <Briefcase size={16} />,
        source: {
          type: 'fields',
          fields: [
            {
              key: 'calisma_durumu',
              label: 'Çalışma Durumu',
              type: 'select',
              options: [
                { value: 'gorevde', label: 'Görevde' },
                { value: 'izinde', label: 'İzinde' },
                { value: 'ayrilmis', label: 'Ayrılmış' },
                { value: 'askida', label: 'Askıda' }
              ]
            },
            { key: 'sgk_giris', label: 'SGK Giriş Tarihi', type: 'date' },
            { key: 'isten_ayrilis', label: 'İşten Ayrılış', type: 'date' },
            { key: 'iban', label: 'IBAN', type: 'text', colSpan: 2 }
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
        createSuccess: 'Personel kaydı oluşturuldu',
        updateSuccess: 'Personel bilgileri güncellendi',
        deleteSuccess: 'Personel kaydı silindi'
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
