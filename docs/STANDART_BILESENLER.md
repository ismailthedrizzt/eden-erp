# Standart Bileşenler Kuralı

<!-- source-of-truth-standard: contract overrides markdown -->

**Proje Genelinde Tek Kullanılacak Bileşenler**

> ⚠️ **KRİTİK**: Aksi bir karar verilmediği sürece projenin tamamında SADECE bu üç bileşen kullanılacaktır:

---

## 1. ImageSlotUploader - Resim Yükleme Bileşeni

**Kullanım:** Tüm resim/fotoğraf/logo yükleme ve görüntüleme işlemleri

```tsx
import { ImageSlotUploader, ImageSlot, SlotImage } from '@/components/ui/ImageSlotUploader'

// Slot tanımları
const imageSlots: ImageSlot[] = [
  { id: 'photo', title: 'Employee Photo', required: true },
  { id: 'id_card', title: 'ID Card', required: false },
  { id: 'signature', title: 'Signature', required: false },
]

// Kullanım
<ImageSlotUploader
  slots={imageSlots}
  images={images}
  onChange={setImages}
  allowExtraSlots={true}
  readOnly={false}
/>
```

**Props:**
```typescript
interface ImageSlot {
  id: string
  title: string
  description?: string
  required?: boolean
  acceptedTypes?: string[]
  maxSizeMB?: number
}

interface SlotImage {
  slotId: string
  file?: File
  previewUrl?: string
  name?: string
  size?: number
  uploadedAt?: Date
}

interface ImageSlotUploaderProps {
  slots: ImageSlot[]
  images: SlotImage[]
  onChange: (images: SlotImage[]) => void
  allowExtraSlots?: boolean
  readOnly?: boolean
  className?: string
}
```

**Kullanım Alanları:**
- ✅ Personel profil fotoğrafı
- ✅ Şirket logoları (birden fazla)
- ✅ ID kart, imza görselleri
- ✅ Ürün/kategori görselleri

---

## 2. DocumentSlotUploader - Doküman Yükleme Bileşeni

**Kullanım:** Tüm doküman/belge yükleme ve görüntüleme işlemleri

```tsx
import { DocumentSlotUploader, DocumentSlot, SlotDocument } from '@/components/ui/DocumentSlotUploader'

// Slot tanımları
const documentSlots: DocumentSlot[] = [
  { id: 'cv', title: 'CV / Resume', required: false },
  { id: 'contract', title: 'Employment Contract', required: true },
  { id: 'health_report', title: 'Health Report', required: false },
]

// Kullanım
<DocumentSlotUploader
  slots={documentSlots}
  documents={documents}
  onChange={setDocuments}
  allowExtraSlots={true}
  readOnly={false}
/>
```

**Props:**
```typescript
interface DocumentSlot {
  id: string
  title: string
  description?: string
  required?: boolean
  acceptedTypes?: string[]
  maxSizeMB?: number
}

interface SlotDocument {
  slotId: string
  file?: File
  name: string
  size: number
  type: string
  uploadedAt?: Date
  url?: string
}

interface DocumentSlotUploaderProps {
  slots: DocumentSlot[]
  documents: SlotDocument[]
  onChange: (documents: SlotDocument[]) => void
  allowExtraSlots?: boolean
  readOnly?: boolean
  className?: string
}
```

**Desteklenen Dosya Tipleri:**
- ✅ PDF (Kırmızı ikon)
- ✅ Word DOC/DOCX (Mavi ikon)
- ✅ Excel XLS/XLSX (Yeşil ikon)
- ✅ PowerPoint PPT/PPTX (Turuncu ikon)
- ✅ ZIP (Mor ikon)

**Kullanım Alanları:**
- ✅ CV yükleme
- ✅ Sözleşmeler, dilekçeler
- ✅ Kimlik/evrak taramaları
- ✅ Vergi levhası, imza sirküleri vb.

---

## 3. UserAvatar - Kullanıcı Avatar Bileşeni

**Kullanım:** Tüm kullanıcı fotoğraf/initials gösterim işlemleri

```tsx
import { UserAvatar, AvatarStack } from '@/components/ui/UserAvatar'

// Fotoğraflı avatar
<UserAvatar 
  name="Ahmet Yılmaz"
  photoUrl="/avatar.jpg"
  size="md"
  status="online"
  showTooltip
/>

// Initials avatar (fotoğraf yoksa otomatik)
<UserAvatar 
  name="Mehmet Demir"
  size="lg"
/>

// Avatar stack (birden fazla kullanıcı)
<AvatarStack 
  users={[
    { name: 'User 1', photoUrl: '/avatar1.jpg' },
    { name: 'User 2' }, // Initials gösterir
    { name: 'User 3', photoUrl: '/avatar3.jpg' }
  ]}
  size="sm"
  maxDisplay={3}
/>
```

**Props:**
```typescript
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away'

interface UserAvatarProps {
  name: string                    // Kullanıcı adı (tooltip ve initials için)
  photoUrl?: string | null        // Profil fotoğrafı URL
  initials?: string               // Manuel initials override
  size?: AvatarSize               // xs:24px, sm:32px, md:40px, lg:48px, xl:64px
  status?: AvatarStatus           // Online durum göstergesi
  showTooltip?: boolean           // Hover'da isim göster (default: true)
  onClick?: () => void            // Tıklanabilir yap
  className?: string
}

interface AvatarStackProps {
  users: Array<{ name: string; photoUrl?: string | null; initials?: string }>
  maxDisplay?: number             // Gösterilecek maksimum avatar (kalan +N olarak gösterilir)
  size?: AvatarSize
  direction?: 'horizontal' | 'vertical'
  showTooltip?: boolean
  className?: string
}
```

**Kullanım Alanları:**
- ✅ Tablo/liste satırlarında kullanıcı gösterimi
- ✅ Yorum ve aktivite logları
- ✅ Görev atamaları
- ✅ Onay akışları
- ✅ Avatar stack (takım gösterimi)

---

## 🚫 YASAKLAR - Kullanılmayacaklar

| Eski/Yerel Bileşen | Yerine Kullanılacak |
|-------------------|---------------------|
| `LogoUploader` (sirket modülü) | `ImageSlotUploader` |
| `DocumentLoader` (sirket modülü) | `DocumentSlotUploader` |
| Inline `<input type="file">` | `ImageSlotUploader` veya `DocumentSlotUploader` |
| Inline `<img>` for avatar | `UserAvatar` |
| Custom drag-drop çözümler | `ImageSlotUploader` / `DocumentSlotUploader` |
| Custom avatar solutions | `UserAvatar` |
| `DocumentViewer` modal | `DocumentSlotUploader` (entegre preview) |

---

## Migration Plan

### 1. Mevcut Bileşenlerin Değiştirilmesi

| Dosya | Mevcut | Yeni |
|-------|--------|------|
| `PersonelForm.tsx` | Inline fotoğraf + DocumentUploader | `ImageSlotUploader` + `DocumentSlotUploader` |
| `SirketForm.tsx` | `LogoUploader` + `DocumentLoader` | `ImageSlotUploader` + `DocumentSlotUploader` |
| Tüm tablo/liste avatarları | Inline `<img>` | `UserAvatar` |

### 2. Silinecek Bileşenler
- ✅ `components/modules/sirket/LogoUploader.tsx`
- ✅ `components/modules/sirket/DocumentLoader.tsx`
- ✅ `components/ui/DocumentUploader.tsx`
- ✅ `components/ui/DocumentViewer.tsx`

### 3. Aktif Standart Bileşenler
- ✅ `components/ui/ImageSlotUploader.tsx`
- ✅ `components/ui/DocumentSlotUploader.tsx`
- ✅ `components/ui/UserAvatar.tsx`

---

## Örnek Kullanım Senaryoları

### Personel Formu - Fotoğraf ve Belgeler
```tsx
// Image slots
const imageSlots: ImageSlot[] = [
  { id: 'photo', title: 'Employee Photo', required: true },
  { id: 'id_card', title: 'ID Card', required: false },
  { id: 'signature', title: 'Signature', required: false },
]

// Document slots
const documentSlots: DocumentSlot[] = [
  { id: 'cv', title: 'CV / Resume', required: false },
  { id: 'contract', title: 'Employment Contract', required: true },
  { id: 'health_report', title: 'Health Report', required: false },
]

// Formda kullanım
<div className="flex flex-col gap-6">
  <ImageSlotUploader
    slots={imageSlots}
    images={images}
    onChange={setImages}
    allowExtraSlots={true}
  />
  
  <DocumentSlotUploader
    slots={documentSlots}
    documents={documents}
    onChange={setDocuments}
    allowExtraSlots={true}
  />
</div>
```

### Tabloda Kullanıcı Avatarı
```tsx
// Tablo satırında
<div className="flex items-center gap-3">
  <UserAvatar 
    name={personel.ad_soyad}
    photoUrl={personel.foto_url}
    size="sm"
    status={personel.aktif ? 'online' : 'offline'}
  />
  <div>
    <p className="font-medium">{personel.ad_soyad}</p>
    <p className="text-xs text-gray-500">{personel.pozisyon}</p>
  </div>
</div>
```

### Avatar Stack (Takım Gösterimi)
```tsx
// Görev atamasında
<div className="flex items-center justify-between">
  <span>Proje Ekibi</span>
  <AvatarStack 
    users={takimUyeleri.map(u => ({ 
      name: u.ad_soyad, 
      photoUrl: u.foto_url 
    }))}
    size="sm"
    maxDisplay={4}
  />
</div>
```

### Yorum Bileşeninde Avatar
```tsx
<div className="flex gap-3">
  <UserAvatar 
    name={yorum.yazar}
    photoUrl={yorum.yazar_foto}
    size="md"
  />
  <div>
    <div className="flex items-center gap-2">
      <span className="font-medium">{yorum.yazar}</span>
      <span className="text-xs text-gray-500">{yorum.tarih}</span>
    </div>
    <p>{yorum.icerik}</p>
  </div>
</div>
```

---

**Son Güncelleme:** 2024-05-01
**Kural Geçerliliği:** Tüm Eden ERP Projesi
**Karar Veren:** İsmail (Kurucu)
