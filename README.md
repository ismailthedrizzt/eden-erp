# Eden Teknoloji ERP

Next.js 14 + Supabase + Vercel ile kurumsal ERP sistemi.

\---

## 🗂️ Proje Yapısı

```
eden-erp/
├── app/
│   ├── page.tsx                    # / → /app yönlendirme
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Tailwind + global stiller
│   ├── login/page.tsx              # OTP login sayfası
│   ├── app/                        # Korumalı uygulama
│   │   ├── layout.tsx              # Sidebar + Topbar shell
│   │   ├── page.tsx                # Ana sayfa
│   │   ├── muhasebe/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── islemler/page.tsx
│   │   │   ├── borclar/page.tsx
│   │   │   ├── projeler/page.tsx
│   │   │   └── hesaplar/page.tsx
│   │   └── ik/
│   │       ├── teskilat/page.tsx
│   │       ├── personel/page.tsx
│   │       └── personel-ekle/page.tsx
│   └── api/
│       ├── auth/otp/route.ts
│       ├── muhasebe/islemler/route.ts
│       └── ik/
│           ├── personel/route.ts
│           └── teskilat/route.ts
├── components/
│   ├── layout/Sidebar.tsx          # Accordion sidebar
│   ├── ui/                         # KpiCard, Badge, Modal, DataTable
│   └── modules/muhasebe/           # IslemModal
├── hooks/                          # useNakitIslemler, usePersonel, useTeskilat
├── lib/supabase/                   # client.ts, server.ts
├── lib/utils.ts                    # formatTRY, formatDate, cn...
├── types/index.ts                  # Tüm TypeScript tipleri
├── supabase/migrations/001\\\\\\\_initial.sql
├── middleware.ts                   # Auth koruması
└── .env.local.example
```

\---

## 🚀 Deploy Adımları

### ADIM 1 — GitHub Reposu Oluştur

1. https://github.com/new adresine gidin
2. Repository adı: `eden-erp`
3. **Private** seçin
4. "Create repository" tıklayın

Terminalden projeyi push edin:

```bash
cd eden-erp
git init
git add .
git commit -m "feat: initial Eden ERP setup"
git branch -M main
git remote add origin https://github.com/KULLANICI\\\\\\\_ADINIZ/eden-erp.git
git push -u origin main
```

\---

### ADIM 2 — Supabase Projesi Kur

1. https://supabase.com/dashboard adresine gidin
2. "New Project" tıklayın
3. Proje adı: `eden-erp`, şifre belirleyin, bölge: **eu-central-1** (Frankfurt)
4. Proje oluşturulunca (1-2 dk) **Settings → API** sayfasına gidin
5. Şu değerleri kopyalayın:

   * `Project URL` → `NEXT\\\\\\\_PUBLIC\\\\\\\_SUPABASE\\\\\\\_URL`
   * `anon public` key → `NEXT\\\\\\\_PUBLIC\\\\\\\_SUPABASE\\\\\\\_ANON\\\\\\\_KEY`
   * `service\\\\\\\_role` key → `SUPABASE\\\\\\\_SERVICE\\\\\\\_ROLE\\\\\\\_KEY`

#### Veritabanını Kur

**SQL Editor** → **New Query** tıklayın, `supabase/migrations/001\\\\\\\_initial.sql` içindeki tüm kodu yapıştırın ve **Run** edin.

Bu komut şunları oluşturur:

* Tablolar: `sirketler`, `birimler`, `personel`, `norm\\\\\\\_kadrolar`, `nakit\\\\\\\_islemler`
* RLS politikaları
* Örnek veriler (Eden Teknoloji A.Ş. + 15 nakit işlem)

#### Auth Ayarları

**Authentication → Providers** altında:

* **Email** provider: Enabled ✓
* **Phone** provider: Enabled (SMS için Twilio veya yerel provider gerekir)

**Authentication → URL Configuration**:

* Site URL: `https://eden-erp.vercel.app` (Vercel deploy'dan sonra güncelleyin)
* Redirect URLs: `https://eden-erp.vercel.app/\\\\\\\*\\\\\\\*`

\---

### ADIM 3 — Vercel'e Deploy Et

1. https://vercel.com/new adresine gidin
2. "Import Git Repository" → GitHub'daki `eden-erp` reposunu seçin
3. **Framework Preset**: Next.js (otomatik algılanır)
4. **Environment Variables** bölümüne ekleyin:

```
NEXT\\\\\\\_PUBLIC\\\\\\\_SUPABASE\\\\\\\_URL        = https://PROJE\\\\\\\_ID.supabase.co
NEXT\\\\\\\_PUBLIC\\\\\\\_SUPABASE\\\\\\\_ANON\\\\\\\_KEY   = eyJ...
SUPABASE\\\\\\\_SERVICE\\\\\\\_ROLE\\\\\\\_KEY       = eyJ...
NEXT\\\\\\\_PUBLIC\\\\\\\_APP\\\\\\\_URL             = https://eden-erp.vercel.app
```

5. **Deploy** tıklayın — yaklaşık 2 dakika sürer

Deploy tamamlandığında Vercel size bir URL verir: `https://eden-erp.vercel.app`

Bu URL'yi Supabase **Site URL** alanına da ekleyin.

\---

### ADIM 4 — Localhost'ta Çalıştır (Opsiyonel)

```bash
# Bağımlılıkları kur
npm install

# Env dosyasını oluştur
cp .env.local.example .env.local
# .env.local içini Supabase değerleriyle doldur

# Geliştirme sunucusu
npm run dev
```

Tarayıcıda açın: http://localhost:3000

\---

### ADIM 5 — İlk Kullanıcı Girişi

Supabase'de **Authentication → Users → Add User** ile ilk kullanıcıyı oluşturun:

* Email: `ismail@edenteknoloji.com`
* Password: (geçici, OTP ile değiştirilecek)

Ya da doğrudan login sayfasında e-posta ile OTP isteyin.

> \\\\\\\*\\\\\\\*Demo:\\\\\\\*\\\\\\\* Login sayfasında herhangi bir e-posta girin, Supabase magic link/OTP gönderir.
> Geliştirme sırasında Supabase Dashboard → Authentication → Logs'dan kodu görebilirsiniz.

\---

## 🔄 Sonraki Geliştirme Adımları (Part 3)

Claude'a şunu söyleyin:

> "eden-erp Part 3: Rol bazlı yetki sistemi, widget dashboard (sürükle-bırak), Ana Sayfa widget galerisi, ve muhasebe için CSV/Excel dışa aktarma ekle"

\---

## 🛠️ Geliştirme Rehberi

### Yeni Sayfa Eklemek

```
app/app/MODUL/SAYFA/page.tsx  →  otomatik route olur
```

Sidebar.tsx içindeki `NAV` dizisine menü öğesini ekleyin.

### Yeni API Endpoint Eklemek

```
app/api/MODUL/ENDPOINT/route.ts  →  /api/MODUL/ENDPOINT
```

### Veritabanı Değişikliği

1. `supabase/migrations/002\\\\\\\_xxx.sql` dosyası oluşturun
2. Supabase SQL Editor'da çalıştırın
3. `types/index.ts` dosyasını güncelleyin

### Tailwind Sınıfı Eklemek

`tailwind.config.ts` → `theme.extend` bölümüne ekleyin.

\---

## 📦 Kullanılan Teknolojiler

|Teknoloji|Versiyon|Açıklama|
|-|-|-|
|Next.js|14.2|App Router, Server Components|
|Supabase|2.x|PostgreSQL, Auth, RLS|
|Tailwind CSS|3.4|Utility-first CSS|
|Recharts|2.x|Grafikler|
|Lucide React|0.379|İkonlar|
|Zod|3.x|API validasyon|
|TypeScript|5.x|Tip güvenliği|



