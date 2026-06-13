# SmartDataTable Kullanım Kılavuzu

<!-- source-of-truth-standard: contract overrides markdown -->

## Temel Kullanım

```tsx
import { SmartDataTable, ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'

// Sütun Tanımları
const columns: ColumnDef[] = [
  {
    key: 'photo',
    label: 'Fotoğraf',
    type: 'image',
    required: true,
    visible: true,
    width: 60,        // Piksel cinsinden genişlik
    fixedWidth: true  // Sabit genişlik, daralmaz
  },
  {
    key: 'fullname',
    label: 'Ad Soyad',
    type: 'text',
    required: true,
    sortable: true,
    filterable: true,
    width: 200,       // Varsayılan genişlik
    minWidth: 120     // Minimum genişlik
  },
  {
    key: 'email',
    label: 'E-posta',
    type: 'text',
    sortable: true,
    filterable: true,
    width: 250,
    fontSize: 'sm'    // 'xs' | 'sm' | 'base' | 'lg'
  },
  {
    key: 'department',
    label: 'Departman',
    type: 'enum',
    enumOptions: ['İK', 'Muhasebe', 'Satış', 'Üretim'],
    sortable: true,
    filterable: true,
    width: 150,
    moduleDependency: 'teskilat' // Pasif modülde görünmez
  },
  {
    key: 'hireDate',
    label: 'İşe Giriş Tarihi',
    type: 'date',
    sortable: true,
    filterable: true,
    width: 140
  },
  {
    key: 'salary',
    label: 'Maaş',
    type: 'number',
    sortable: true,
    width: 120,
    permission: 'salary.view' // Yetki kontrolü
  },
  {
    key: 'isActive',
    label: 'Aktif',
    type: 'boolean',
    width: 80,
    render: (value) => value ? '🟢' : '🔴'
  }
]

// Widget Tanımları
const widgets: WidgetDef[] = [
  {
    key: 'totalEmployees',
    label: 'Toplam Çalışan',
    render: (row) => 'Detay...'
  },
  {
    key: 'departmentCount',
    label: 'Departman Sayısı',
    render: (row) => '12'
  }
]

// Kullanım
<SmartDataTable
  data={personelList}
  columns={columns}
  title="Personel Listesi"
  storageKey="personel-list"
  widgets={widgets}
  defaultView="list"
  defaultPageSize={25}
  pageSizeOptions={[10, 25, 50, 100]}
  realtime={true}
  pollingInterval={30000}
  onRowClick={(row) => console.log('Clicked:', row)}
  onRefresh={() => refetchData()}
/>
```

## Özellikler

### 1. Sütun Ekonomisi (Column Economy)
- **Genişlik Kotası**: Her sütun piksel cinsinden genişlik değeri taşır
- **Genişlik Kotası Göstergesi**: Ekran genişliğine göre kalan kotayı gösterir
- **Otomatik Sığdırma**: Sütunlar ekrana sığmadığında font boyutu otomatik küçülür (xs → sm → base)
- **Sabit Genişlik**: `fixedWidth: true` ile sütun daralmaz
- **Kota Aşımı Engeli**: Kotanın üzerinde sütun seçilemez
- **Ekran Boyutları**: sm (360px), md (540px), lg (768px), xl (1200px)

### 2. Sütun Sürükle-Bırak
- **Tablo Başlığı**: Sütun başlıkları sürüklenebilir
- **Seçim Paneli**: Görünür sütunlar panel içinde sıralanabilir
- **Anlık Geri Bildirim**: Bırakma hedefi mavi renkte vurgulanır
- **Sütun Sırası**: localStorage'da saklanır

### 3. Çoklu Sıralama
- Birden fazla sütuna göre sıralama yapılabilir
- Sıralama önceliği numarası gösterilir (1, 2, 3...)
- Tıklama ile sıralama değiştirilir: ASC → DESC → Kaldır

### 4. Filtreleme
- Global arama (tüm görünür sütunlarda)
- Sütun bazlı filtreleme paneli
- Metin: içerik arama
- Enum: seçim listesi
- Tarih: aralık seçimi
- Sayı: büyüktür/küçüktür

### 5. Görünüm Modları
- **Liste**: Geleneksel tablo görünümü
- **Kart**: Grid layout, profil fotoğraflı kartlar
- Seçim localStorage'da saklanır

### 6. Widget Overlay
- Satır üzerine gelince açılan bilgi paneli
- İstatistik widgetları gösterir
- Modül bağımlılığı destekler

### 7. Sayfalama
- Sayfa boyutu seçimi (10, 25, 50, 100)
- Tercih kullanıcı bazında saklanır
- İlk/Son sayfa butonları

### 8. Gerçek Zamanlı Güncelleme
- Otomatik yenileme (polling)
- Yapılandırılabilir aralık (varsayılan: 30sn)

## Veri Tipi Detayları

| Tip | Açıklama | Filtre |
|-----|----------|--------|
| `text` | Metin alanı | İçerik arama |
| `number` | Sayısal değer | Karşılaştırma |
| `date` | Tarih | Aralık seçimi |
| `enum` | Sabit liste | Dropdown |
| `boolean` | Evet/Hayır | Toggle |
| `image` | Resim URL | - |

## Responsive Davranış

| Ekran | Max Tablo Genişliği | Görünür Sütun Limiti | Font Boyutu Adaptasyonu |
|-------|---------------------|----------------------|-------------------------|
| **sm** (<640px) | 360px | İlk 3 sütun | Otomatik xs |
| **md** (640-768px) | 540px | İlk 4 sütun | Otomatik xs/sm |
| **lg** (768-1024px) | 768px | Sınırsız | Otomatik sm/base |
| **xl** (>1024px) | 1200px | Sınırsız | Varsayılan |

### Ekran Kotası Aşımında:
1. **Sabit Genişlikli Sütunlar**: Önce sabit genişlikli sütunlar korunur
2. **Font Boyutu Küçülür**: Geniş sütunlarda font otomatik küçülür
3. **Kalan Sütunlar Daralır**: Esnek sütunlar orantılı daralır
4. **Uyarı Gösterilir**: Turuncu uyarı ikonu belirir

## Sütun Yapılandırması

```tsx
interface ColumnDef {
  key: string           // Benzersiz anahtar
  label: string         // Görünen başlık
  type: ColumnType      // 'text' | 'number' | 'date' | 'enum' | 'boolean' | 'image'
  width?: number        // Piksel cinsinden genişlik (varsayılan: 150)
  minWidth?: number     // Minimum genişlik (varsayılan: 80)
  maxWidth?: number     // Maksimum genişlik
  fixedWidth?: boolean  // Sabit genişlik, daralmaz
  fontSize?: 'xs' | 'sm' | 'base' | 'lg'  // Varsayılan font boyutu
  required?: boolean    // Zorunlu alan (varsayılan görünür)
  visible?: boolean     // Başlangıç görünürlüğü
  sortable?: boolean    // Sıralanabilir mi?
  filterable?: boolean  // Filtrelenebilir mi?
  moduleDependency?: string  // Aktif modül gereksinimi
  permission?: string   // Yetki gereksinimi
  render?: (value, row) => React.ReactNode  // Özel render
}
```

## Styling

- Dark mode desteği
- Responsive tasarım
- Tailwind CSS ile tam uyumlu
- Özelleştirilebilir genişlikler
- Drag-drop görsel geri bildirim (mavi vurgu)
- Kota aşımı uyarıları (turuncu/yeşil)
