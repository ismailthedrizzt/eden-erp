# Sistem - Genel Ayarlar Sayfası

<!-- source-of-truth-standard: contract overrides markdown -->

**Module**: Sistem (sistem)  
**Submodule**: Ayarlar (ayarlar)  
**Path**: `app/app/sistem/ayarlar/page.tsx`  
**Status**: ⏳ Not Implemented

## Purpose

System-wide configuration management including company settings, application preferences, and operational parameters.

## Data Model

### Settings Table

```sql
CREATE TABLE sistem_ayarlari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  
  -- Setting Key (namespaced)
  kategori VARCHAR(50) NOT NULL,   -- 'genel', 'mail', 'bildirim', 'guvenlik'
  anahtar VARCHAR(100) NOT NULL,   -- 'sirket_adi', 'logo_url'
  
  -- Value (JSON for flexibility)
  deger JSONB NOT NULL,
  
  -- Data type hint for UI
  veri_tipi VARCHAR(20) DEFAULT 'string',  -- 'string', 'number', 'boolean', 'json', 'date'
  
  -- UI Labels
  etiket VARCHAR(200),      -- Display label
  aciklama TEXT,            -- Help text
  
  -- Validation
  zorunlu BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id, kategori, anahtar)
);

-- Company table extension
ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
  varsayilan_para_birimi VARCHAR(3) DEFAULT 'TRY';

ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  dil VARCHAR(10) DEFAULT 'tr';
```

### Predefined Settings

```sql
-- General Settings
INSERT INTO sistem_ayarlari (kategori, anahtar, veri_tipi, etiket, aciklama) VALUES
('genel', 'sirket_adi', 'string', 'Şirket Adı', 'Resmi şirket unvanı'),
('genel', 'sirket_kisa_ad', 'string', 'Kısa Ad', 'Sistemde görünecek kısa ad'),
('genel', 'logo_url', 'string', 'Logo URL', 'Şirket logosu görseli'),
('genel', 'favicon_url', 'string', 'Favicon URL', 'Tarayıcı sekmesi ikonu'),
('genel', 'para_birimi', 'string', 'Varsayılan Para Birimi', 'TRY, USD, EUR'),
('genel', 'tarih_formati', 'string', 'Tarih Formatı', 'DD.MM.YYYY, YYYY-MM-DD'),
('genel', 'saat_dilimi', 'string', 'Saat Dilimi', 'Europe/Istanbul, UTC'),
('genel', 'dil', 'string', 'Sistem Dili', 'tr, en');

-- Email Settings
INSERT INTO sistem_ayarlari (kategori, anahtar, veri_tipi, etiket, aciklama) VALUES
('mail', 'smtp_host', 'string', 'SMTP Sunucu', 'Mail sunucu adresi'),
('mail', 'smtp_port', 'number', 'SMTP Port', '587, 465, 25'),
('mail', 'smtp_kullanici', 'string', 'SMTP Kullanıcı', 'Mail gönderim hesabı'),
('mail', 'smtp_sifre', 'string', 'SMTP Şifre', 'Hesap şifresi'),
('mail', 'smtp_tls', 'boolean', 'TLS Kullan', 'Güvenli bağlantı'),
('mail', 'gonderen_ad', 'string', 'Gönderen Adı', 'Email gönderen görünen ad'),
('mail', 'gonderen_email', 'string', 'Gönderen Email', 'noreply@company.com'),
('mail', 'test_email', 'string', 'Test Email Adresi', 'Test mail gönderilecek adres');

-- Notification Settings
INSERT INTO sistem_ayarlari (kategori, anahtar, veri_tipi, etiket, aciklama) VALUES
('bildirim', 'email_bildirim', 'boolean', 'Email Bildirimleri', 'Email ile bildirim gönder'),
('bildirim', 'bildirim_sure', 'number', 'Bildirim Süresi', 'Ekranda kalma süresi (saniye)'),
('bildirim', 'sesli_bildirim', 'boolean', 'Sesli Bildirim', 'Yeni bildirimde ses çal'),
('bildirim', 'onay_bekleyen_saat', 'number', 'Onay Bekleyen Uyarı', 'X saat geçince uyar');

-- Security Settings
INSERT INTO sistem_ayarlari (kategori, anahtar, veri_tipi, etiket, aciklama) VALUES
('guvenlik', 'min_sifre_uzunluk', 'number', 'Min. Şifre Uzunluğu', 'Minimum karakter sayısı'),
('guvenlik', 'sifre_buyuk_harf', 'boolean', 'Büyük Harf Zorunlu', 'En az bir büyük harf'),
('guvenlik', 'sifre_kucuk_harf', 'boolean', 'Küçük Harf Zorunlu', 'En az bir küçük harf'),
('guvenlik', 'sifre_rakam', 'boolean', 'Rakam Zorunlu', 'En az bir rakam'),
('guvenlik', 'sifre_ozel', 'boolean', 'Özel Karakter Zorunlu', 'En az bir özel karakter'),
('guvenlik', 'oturum_suresi', 'number', 'Oturum Süresi', 'Dakika cinsinden'),
('guvenlik', 'basarisiz_giris', 'number', 'Başarısız Giriş Limiti', 'Kilitleme öncesi deneme'),
('guvenlik', 'iki_faktor', 'boolean', '2FA Zorunlu', 'Tüm kullanıcılar için 2FA');

-- Workflow Settings
INSERT INTO sistem_ayarlari (kategori, anahtar, veri_tipi, etiket, aciklama) VALUES
('surec', 'varsayilan_onay_saat', 'number', 'Varsayılan Onay Süresi', 'Saat cinsinden'),
('surec', 'hatirlatma_aralik', 'number', 'Hatırlatma Aralığı', 'Saat cinsinden'),
('surec', 'otomatik_reddet', 'boolean', 'Süre Dolunca Reddet', 'Alternatif: Eskalasyon'),
('surec', 'gecmis_kayit', 'number', 'Geçmiş Kayıt Süresi', 'Ay cinsinden saklama');
```

### TypeScript Interface

```typescript
interface SistemAyari {
  id: string
  company_id: string
  
  kategori: 'genel' | 'mail' | 'bildirim' | 'guvenlik' | 'surec'
  anahtar: string
  deger: any
  veri_tipi: 'string' | 'number' | 'boolean' | 'json' | 'date'
  
  etiket: string
  aciklama?: string
  zorunlu: boolean
  
  updated_at: string
  updated_by?: string
}

type AyarKategorisi = {
  key: string
  label: string
  icon: ReactNode
  ayarlar: SistemAyari[]
}
```

## UI Specifications

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ PageBanner: "Sistem Ayarları" [Değişiklikleri Kaydet]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────┐  ┌─────────────────────────────────────────┐  │
│  │ KATEGORİLER│  │ AYAR FORMU                             │  │
│  │            │  │                                        │  │
│  │ ⚙️ Genel   │  │ Şirket Adı                             │  │
│  │            │  │ ┌───────────────────────────────────┐  │  │
│  │ 📧 Email   │  │ │ Eden Yazılım ve Danışmanlık A.Ş. │  │  │
│  │            │  │ └───────────────────────────────────┘  │  │
│  │ 🔔 Bildirim│  │                                        │  │
│  │            │  │ Kısa Ad                                │  │
│  │ 🔒 Güvenlik│  │ ┌───────────────────────────────────┐  │  │
│  │            │  │ │ Eden ERP                           │  │  │
│  │ ⏱️ Süreçler│  │ └───────────────────────────────────┘  │  │
│  │            │  │                                        │  │
│  │ 🎨 Tema    │  │ Logo                                   │  │
│  │            │  │ ┌─────────────────┬─────────────────┐  │  │
│  └────────────┘  │ │ 📷 preview.png  │ [Değiştir]      │  │  │
│                   │ └─────────────────┴─────────────────┘  │  │
│                   │                                        │  │
│                   │ Varsayılan Para Birimi                 │  │
│                   │ ┌───────────────────────────────────┐  │  │
│                   │ │ ▼ TRY - Türk Lirası               │  │  │
│                   │ └───────────────────────────────────┘  │  │
│                   │                                        │  │
│                   │ [Kaydet] [Varsayılana Sıfırla]         │  │
│                   └─────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Category Sidebar

| Key | Label | Icon | Description |
|-----|-------|------|-------------|
| genel | Genel Ayarlar | Settings | Company identity, locale |
| mail | Email Ayarları | Mail | SMTP configuration |
| bildirim | Bildirim Ayarları | Bell | Notification preferences |
| guvenlik | Güvenlik | Shield | Password policy, session |
| surec | Süreç Ayarları | Workflow | Workflow engine defaults |
| tema | Tema Ayarları | Palette | Colors, branding |

### Setting Input Types

Based on `veri_tipi`:

```typescript
function renderAyarInput(ayar: SistemAyari) {
  switch (ayar.veri_tipi) {
    case 'string':
      return <Input type="text" value={ayar.deger} />
      
    case 'number':
      return <Input type="number" value={ayar.deger} />
      
    case 'boolean':
      return <ToggleSwitch checked={ayar.deger} />
      
    case 'json':
      return <JsonEditor value={ayar.deger} />
      
    case 'date':
      return <DatePicker value={ayar.deger} />
  }
}
```

## Special Settings

### 1. Email Configuration Test

```typescript
async function testEmailConfig() {
  const testEmail = await getAyar('mail', 'test_email')
  
  const response = await fetch('/api/system/email/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      to: testEmail,
      subject: 'Eden ERP - Email Test',
      body: 'Email configuration is working!'
    })
  })
  
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    toast.error('Email gönderilemedi: ' + (payload?.message || response.statusText))
  } else {
    toast.success('Test email gönderildi!')
  }
}
```

### 2. Logo Upload

```typescript
async function uploadLogo(file: File) {
  const { data, error } = await supabase.storage
    .from('company-assets')
    .upload(`${companyId}/logo.png`, file, {
      upsert: true,
      contentType: 'image/png'
    })
  
  if (error) throw error
  
  const { data: { publicUrl } } = supabase.storage
    .from('company-assets')
    .getPublicUrl(`${companyId}/logo.png`)
  
  await updateAyar('genel', 'logo_url', publicUrl)
}
```

### 3. Reset to Defaults

```typescript
async function resetToDefaults(kategori?: string) {
  const defaults = {
    'genel.para_birimi': 'TRY',
    'genel.dil': 'tr',
    'mail.smtp_port': 587,
    'guvenlik.min_sifre_uzunluk': 8,
    // ... more defaults
  }
  
  for (const [key, value] of Object.entries(defaults)) {
    const [kat, anahtar] = key.split('.')
    if (!kategori || kat === kategori) {
      await updateAyar(kat, anahtar, value)
    }
  }
}
```

## Settings Hook

```typescript
function useSistemAyarlari(kategori?: string) {
  const [ayarlar, setAyarlar] = useState<SistemAyari[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    fetchAyarlar()
  }, [kategori])

  const fetchAyarlar = async () => {
    let query = supabase
      .from('sistem_ayarlari')
      .select('*')
      .eq('company_id', currentCompanyId)
    
    if (kategori) {
      query = query.eq('kategori', kategori)
    }
    
    const { data } = await query.order('kategori').order('anahtar')
    setAyarlar(data || [])
    setYukleniyor(false)
  }

  const updateAyar = async (anahtar: string, deger: any) => {
    const { error } = await supabase
      .from('sistem_ayarlari')
      .update({ deger, updated_at: new Date(), updated_by: currentUserId })
      .eq('company_id', currentCompanyId)
      .eq('anahtar', anahtar)
    
    if (error) throw error
    await fetchAyarlar()
  }

  const getAyar = (anahtar: string): any => {
    return ayarlar.find(a => a.anahtar === anahtar)?.deger
  }

  return { ayarlar, yukleniyor, updateAyar, getAyar, refetch: fetchAyarlar }
}
```

## Global Settings Access

### Context Provider

```typescript
// Provide settings to entire app
const AyarContext = createContext<AyarContextType>(null)

export function AyarProvider({ children }) {
  const { getAyar } = useSistemAyarlari()
  
  const value = {
    paraBirimi: getAyar('para_birimi') || 'TRY',
    dil: getAyar('dil') || 'tr',
    tarihFormati: getAyar('tarih_formati') || 'DD.MM.YYYY',
    // ... other commonly used settings
  }
  
  return <AyarContext.Provider value={value}>{children}</AyarContext.Provider>
}
```

## Business Rules

1. **Company Isolation**: Settings are per-company
2. **Type Safety**: Values must match `veri_tipi`
3. **Required Fields**: `zorunlu=true` cannot be null
4. **Validation**: Custom validation per setting type
5. **Audit**: Log all setting changes with old/new values
6. **Defaults**: New companies get default settings created automatically

## Related Pages

- **Şirketler**: Multi-company management
- **Modül Lisansları**: Feature availability
- **Kullanıcılar**: User-specific settings override

## Implementation Checklist

- [ ] Create `app/app/sistem/ayarlar/page.tsx`
- [ ] Create `hooks/useSistemAyarlari.ts`
- [ ] Create database table and seed data
- [ ] Create `components/modules/sistem/AyarForm.tsx`
- [ ] Create `components/modules/sistem/AyarKategoriMenu.tsx`
- [ ] Implement file upload for logo/favicon
- [ ] Add email test functionality
- [ ] Add reset to defaults
- [ ] Create settings context provider
- [ ] Add to sidebar navigation
