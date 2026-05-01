# Standart Bileşenler Kuralı

**Proje Genelinde Tek Kullanılacak Bileşenler**

> ⚠️ **KRİTİK**: Aksi bir karar verilmediği sürece projenin tamamında SADECE bu iki bileşen kullanılacaktır:

---

## 1. ImageUploader - Tek Resim Bileşeni

**Kullanım:** Tüm resim/fotoğraf/logo yükleme ve görüntüleme işlemleri

```tsx
import { ImageUploader } from '@/components/ui/ImageUploader'

// Tekli resim (profil fotoğrafı, şirket logosu vb.)
<ImageUploader
  value={imageFile}
  onChange={(file) => setImage(file)}
  previewUrl={currentImageUrl} // Mevcut görsel için
  readOnly={false} // veya true görüntüleme modu için
  maxSizeMB={5}
  acceptedTypes={['image/jpeg', 'image/png']}
  aspectRatio="square" // "square" | "portrait" | "landscape"
  placeholder="Fotoğraf yükleyin"
/>
```

**Props:**
```typescript
interface ImageUploaderProps {
  value?: File | null
  previewUrl?: string
  onChange?: (file: File | null) => void
  readOnly?: boolean
  maxSizeMB?: number
  acceptedTypes?: string[]
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'free'
  placeholder?: string
  width?: number | string
  height?: number | string
}
```

**Kullanım Alanları:**
- ✅ Personel profil fotoğrafı
- ✅ Şirket logosu (tek logo ise)
- ✅ Ürün/kategori görselleri
- ✅ Belge içindeki imza/karekod görselleri

---

## 2. MultiImageUploader - Çoklu Resim Bileşeni

**Kullanım:** Birden fazla resim gerektiğinde (galeri, çoklu logo vb.)

```tsx
import { MultiImageUploader, ImageItem } from '@/components/ui/MultiImageUploader'

// Çoklu resim (galeri, portfolyo, çoklu logo)
<MultiImageUploader
  images={images}
  onChange={(images) => setImages(images)}
  maxFiles={10}
  maxSizeMB={5}
  allowPrimarySelection={true} // Asıl görsel seçimi
  readOnly={false}
/>
```

**Props:**
```typescript
interface ImageItem {
  id?: string
  file?: File
  url?: string
  isPrimary?: boolean
  name?: string
}

interface MultiImageUploaderProps {
  images: ImageItem[]
  onChange: (images: ImageItem[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
  allowPrimarySelection?: boolean
  readOnly?: boolean
}
```

**Kullanım Alanları:**
- ✅ Şirket logoları (birden fazla logo varsa)
- ✅ Ürün galerisi
- ✅ Proje portfolyosu
- ✅ Ekip fotoğrafları

---

## 3. DocumentUploader - Tek Doküman Bileşeni

**Kullanım:** Tüm doküman/belge yükleme ve görüntüleme işlemleri

```tsx
import { DocumentUploader, DocumentItem } from '@/components/ui/DocumentUploader'

// Tek veya çoklu doküman
<DocumentUploader
  documents={documents}
  onChange={(docs) => setDocuments(docs)}
  maxFiles={5}
  maxSizeMB={10}
  acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.png']}
  documentTypes={[ // Opsiyonel kategoriler
    { id: 'cv', label: 'CV', required: true },
    { id: 'contract', label: 'Sözleşme', required: true },
    { id: 'other', label: 'Diğer', required: false }
  ]}
  readOnly={false}
/>
```

**Props:**
```typescript
interface DocumentItem {
  id?: string
  file?: File
  url?: string
  name: string
  type?: string // Kategori ID
  uploadedAt?: string
  size?: number
}

interface DocumentType {
  id: string
  label: string
  required: boolean
  description?: string
}

interface DocumentUploaderProps {
  documents: DocumentItem[]
  onChange: (documents: DocumentItem[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
  documentTypes?: DocumentType[] // Kategori tanımlama
  readOnly?: boolean
}
```

**Kullanım Alanları:**
- ✅ CV yükleme
- ✅ Sözleşmeler, dilekçeler
- ✅ Kimlik/evrak taramaları
- ✅ Vergi levhası, imza sirküleri vb.

---

## 🚫 YASAKLAR - Kullanılmayacaklar

| Eski/Yerel Bileşen | Yerine Kullanılacak |
|-------------------|---------------------|
| `LogoUploader` (sirket modülü) | `MultiImageUploader` veya `ImageUploader` |
| `DocumentLoader` (sirket modülü) | `DocumentUploader` |
| Inline `<input type="file">` | `ImageUploader` veya `DocumentUploader` |
| Inline `<img>` preview | `ImageUploader` |
| Custom drag-drop çözümler | `ImageUploader` / `DocumentUploader` |

---

## 📝 Kural Özeti

1. **Tek Resim İşlemleri** → `ImageUploader`
2. **Çoklu Resim İşlemleri** → `MultiImageUploader`
3. **Tüm Doküman İşlemleri** → `DocumentUploader`
4. **Inline/custom çözümler KESİNLİKLE yasak**
5. **Bir modülde özel uploader oluşturulmayacak**

---

## Migration Plan

### 1. Mevcut Bileşenlerin Değiştirilmesi

| Dosya | Mevcut | Yeni |
|-------|--------|------|
| `PersonelForm.tsx` | Inline fotoğraf + DocumentUploader | `ImageUploader` + `DocumentUploader` |
| `SirketForm.tsx` | `LogoUploader` + `DocumentLoader` | `MultiImageUploader` + `DocumentUploader` |

### 2. Silinecek Bileşenler
- `components/modules/sirket/LogoUploader.tsx`
- `components/modules/sirket/DocumentLoader.tsx`

### 3. Oluşturulacak Bileşenler
- `components/ui/ImageUploader.tsx`
- `components/ui/MultiImageUploader.tsx`
- `components/ui/DocumentUploader.tsx` (güncelleme)

---

## Örnek Kullanım Senaryoları

### Personel Profil Fotoğrafı
```tsx
<ImageUploader
  previewUrl={personel.foto_url}
  onChange={(file) => handleFotoUpload(file)}
  aspectRatio="square"
  placeholder="Profil fotoğrafı"
/>
```

### Şirket Logoları (Çoklu)
```tsx
<MultiImageUploader
  images={sirket.logolar || []}
  onChange={(logolar) => handleLogolarChange(logolar)}
  allowPrimarySelection={true}
  maxFiles={5}
/>
```

### CV ve Evraklar
```tsx
<DocumentUploader
  documents={personel.evraklar || []}
  onChange={(evraklar) => handleEvrakChange(evraklar)}
  documentTypes={[
    { id: 'cv', label: 'CV / Özgeçmiş', required: true },
    { id: 'contract', label: 'İş Sözleşmesi', required: true },
    { id: 'health', label: 'Sağlık Raporu', required: false },
    { id: 'other', label: 'Diğer Evraklar', required: false }
  ]}
/>
```

---

**Son Güncelleme:** 2024-05-01
**Kural Geçerliliği:** Tüm Eden ERP Projesi
**Karar Veren:** İsmail (Kurucu)
