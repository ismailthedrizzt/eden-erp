import { Briefcase, FileText, GraduationCap, Heart, Landmark, Phone, UserCircle } from 'lucide-react'
import type { ModuleConfig } from '@/types/module-config'
import type { Personel } from '@/types'

export type PersonelTableRow = Personel & {
  fullname: string
  birim_adi: string
  kadro_unvani: string
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
    realtime: true,
    pollingInterval: 30000,
    emptyText: 'Henüz çalışan kaydı bulunmamaktadır.',
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
    entityName: 'Çalışanlar',
    entityNameSingular: 'Çalışan',
    hero: {
      mediaSlots: [
        { key: 'photo', label: 'Fotoğraf', type: 'image', required: false },
        { key: 'cv', label: 'CV', type: 'document', required: false }
      ],
      fields: [
        { key: 'ad', label: 'Adı', type: 'text', required: true },
        { key: 'soyad', label: 'Soyadı', type: 'text', required: true },
        {
          key: 'uyruk',
          label: 'Uyruğu',
          type: 'select',
          required: true,
          compact: true,
          options: [
            { value: 'tc', label: 'T.C.' },
            { value: 'yabanci', label: 'Yabancı' }
          ]
        },
        { key: 'tc_kimlik', label: 'TC Kimlik No', type: 'text', required: true, visibleWhen: { field: 'uyruk', operator: 'equals', value: 'tc' } },
        { key: 'pasaport_no', label: 'Pasaport No', type: 'text', required: true, visibleWhen: { field: 'uyruk', operator: 'equals', value: 'yabanci' } },
        {
          key: 'cinsiyet',
          label: 'Cinsiyeti',
          type: 'select',
          required: true,
          compact: true,
          options: [
            { value: '', label: 'Seçiniz' },
            { value: 'erkek', label: 'Erkek' },
            { value: 'kadin', label: 'Kadın' }
          ]
        },
        { key: 'dogum_tarihi', label: 'Doğum Tarihi', type: 'date', compact: true },
        { key: 'dogum_yeri', label: 'Doğum Yeri', type: 'text' },
        {
          key: 'kan_grubu',
          label: 'Kan Grubu',
          type: 'select',
          compact: true,
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
                  { name: 'numara', key: 'numara', label: 'Telefon Numarası', type: 'tel', required: true }
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
                  { name: 'seviye', key: 'seviye', label: 'Seviye', type: 'text', required: true },
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
        key: 'calisma',
        label: 'İş',
        icon: <Briefcase size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'is_lifecycle', label: 'İş Hareketleri', type: 'workLifecycle', colSpan: 3 }
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
                { value: '', label: 'Seçiniz' },
                { value: 'bekar', label: 'Bekar' },
                { value: 'evli', label: 'Evli' },
                { value: 'dul', label: 'Dul' },
                { value: 'bosanmis', label: 'Boşanmış' }
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
                fields: [
                  { name: 'ad', key: 'ad', label: 'Adı', type: 'text', required: true },
                  { name: 'soyad', key: 'soyad', label: 'Soyadı', type: 'text', required: true },
                  { name: 'yakinlik', key: 'yakinlik', label: 'Yakınlık Derecesi', type: 'text', required: true }
                ]
              }
            }
          ]
        }
      },
      {
        key: 'banka',
        label: 'Banka',
        icon: <Landmark size={16} />,
        source: {
          type: 'fields',
          fields: [
            { key: 'iban', label: 'IBAN', type: 'iban', colSpan: 2 }
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
