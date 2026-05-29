# Customer Onboarding / Workspace Setup Product Spec

## Amac
Yeni musteri ilk giriste bos ve teknik bir ERP ile karsilasmaz. Eden ERP, calisma alanini hazirlama, ilk sirket taslagi, sirket acilisi, modul hazirligi, sistem turu, Action Guide ve Action Center adimlarini sade bir baslangic deneyimine donusturur.

## Kapsam
- Tenant-level `workspace_onboarding_state`
- User-level ilk giris, tur ve yardim tercihleri
- Ilk karsilama modal deneyimi
- Baslangic merkezi ve checklist
- Ilk sirket taslagi ve sirket acilisi yonlendirmesi
- Modul paketleri ve readiness ozeti
- Workspace profile ve baslangic paketi tercihleri
- Action Guide onboarding sorulari
- Action Center onboarding item kaynagi
- Cookie yerine backend canonical state

## Kapsam Disi
- Yeni platform/tenant provisioning katmani
- Tam musteri basari dashboard'u
- Faturalama veya lisans satin alma akisi
- E-posta davet sisteminin tamamlanmasi
- Import/migration odakli otomatik onboarding

## Ilke
Ilk giriste kullanici teknik kurulum ekranlariyla bas basa birakilmaz. Sistem, "simdi ne yapmaliyim?" sorusuna is dilinde yanit verir. Kritik onboarding state'i cookie ile degil backend tarafinda saklanir.

## Workspace Onboarding State
`workspace_onboarding_state` tenant seviyesinde tutulur.

Durumlar:
- `not_started`
- `in_progress`
- `completed`
- `skipped`

Adimlar:
- `welcome`
- `workspace_profile`
- `module_selection`
- `readiness_check`
- `first_company_draft`
- `first_company_opening`
- `guided_tour`
- `action_guide_intro`
- `action_center_intro`
- `finish`

## User Tour State
User-level state `user_workspace_state.ui_preferences` icinde tutulur.

Alanlar:
- `hasSeenGlobalTour`
- `hasSeenFirstRunWelcome`
- `completedTourSteps`
- `completedPageTours`
- `dismissedHints`
- `preferredHelpMode`
- `actionGuideIntroSeen`
- `actionCenterIntroSeen`
- `lastOnboardingVersion`
- `helpLevel`

Kural:
- Genel tur user-level kalir.
- Workspace checklist tenant-level kalir.
- Kullanici yardim durumunu sifirlayabilir.
- Onboarding tamamlandiysa ilk giris welcome tekrar otomatik acilmaz.

## Ilk Sirket Akisi
1. Kullanici welcome ekranini gorur.
2. Baslangic Merkezine gider.
3. Ilk sirket taslagini olusturur.
4. Sirket Acilisi sihirbazini tamamlar.
5. Active sirket sonrasi ortak, temsilci, sube, cari kart ve kullanici yetki adimlari onerilir.

Dashboard empty state'leri:
- Hic sirket yok: ilk sirket taslagi olustur.
- Taslak sirket var, active yok: sirket acilisi sihirbazini ac.
- Active sirket var: ortak, temsilci, sube, cari kart ve kullanici adimlarini oner.

## Module Setup Checklist
Checklist kullaniciya teknik tablo adlari yerine is adimlarini gosterir:
- Calisma alani karsilandi
- Calisma alani profili
- Modul paketleri
- Modul readiness kontrolu
- Ilk sirket taslagi
- Ilk sirket acilisi
- Genel sistem turu
- Action Guide
- Action Center
- Kurulumu tamamla

Her adim su bilgileri tasir:
- `status`: completed, current, pending, warning, blocked
- baslik ve aciklama
- aksiyon etiketi ve hedef sayfa
- disabled reason

## Workspace Profile
Ilk kurulumda toplanabilecek profil alanlari:
- calisma alani adi
- sektor
- varsayilan para birimi
- varsayilan dil
- zaman dilimi
- ulke
- beklenen sirket sayisi
- baslangic modul paketi

Bu bilgiler tenant settings, user preferences ve modul onerileri icin kullanilabilir.

## Modul Paketleri
Baslangic paketi:
- Sirketlerimiz
- Ortaklarimiz
- Temsilcilerimiz
- Subelerimiz
- Belgeler
- Action Center
- Audit
- Kurulum Merkezi

Operasyon paketi:
- Teskilat/Kadro
- Tesisler/Lokasyonlar
- Proje/Gorev
- Satis Sonrasi

Finans paketi:
- Muhasebe / Cari Kartlar
- Cari Hareketler
- Raporlama

IK paketi:
- Calisanlar
- Istihdam lifecycle

Lisanssiz veya readiness bloklu modul kullaniciya teknik hata yerine kurulum/lisans mesaji gosterir.

## Action Guide Entegrasyonu
Action Guide su sorulara onboarding state ile yanit verir:
- Nasil baslayacagim?
- Ilk sirketi nasil eklerim?
- Sirket taslagi nedir?
- Sirketi nasil aktif hale getiririm?
- Kurulum eksikleri nerede?

State bazli davranis:
- Hic sirket yoksa ilk sirket taslagi onerilir.
- Taslak sirket varsa sirket acilisi onerilir.
- Active sirket varsa ortak, temsilci, sube ve cari kart adimlari onerilir.

## Action Center Entegrasyonu
Admin/system kullanicilar icin onboarding kaynakli itemlar Action Center'a eklenebilir:
- Ilk sirket taslagi olusturulmadi
- Ilk sirket acilisi tamamlanmadi
- Calisma alani kurulumu tamamlanmadi

`source_type = onboarding`

Read notification veya tur tamamlama Action Center item'ini otomatik tamamlamaz. Action Center, aksiyon gerektiren is listesi olarak kalir.

## UX Copy
Welcome:
"Eden ERP'ye hos geldiniz. Kayitlarinizi once taslak olarak olusturur, resmi sonuc doguran islemleri ise adim adim sihirbazlarla tamamlarsiniz."

Bos dashboard:
"Henuz aktif sirket kaydiniz yok. Eden ERP'de islemler sirketler uzerinden yurur. Baslamak icin ilk sirket karti taslaginizi olusturun."

Tamamlama:
"Calisma alaninizin temel kurulumu tamamlandi. Artik sirket kayitlarinizi ve operasyonlarinizi yonetmeye baslayabilirsiniz."

## API Endpoints
- `GET /api/v1/onboarding/workspace`
- `PATCH /api/v1/onboarding/workspace`
- `POST /api/v1/onboarding/workspace/complete-step`
- `POST /api/v1/onboarding/workspace/skip`
- `POST /api/v1/onboarding/workspace/reset`
- `GET /api/v1/onboarding/user`
- `PATCH /api/v1/onboarding/user`
- `POST /api/v1/onboarding/user/complete-tour`
- `POST /api/v1/onboarding/user/dismiss-hint`
- `POST /api/v1/onboarding/user/reset-help`

## Permissions
Workspace onboarding mutation admin/setup yetkisi ister:
- `system.admin`
- `settings.edit`
- `settings.modulesManage`

User onboarding state kullanicinin kendi yardim/tur tercihidir.

## Frontend Surface
- `app/app/onboarding/page.tsx`: Baslangic Merkezi
- `components/onboarding/FirstRunWelcome.tsx`: ilk giris modal deneyimi
- `components/onboarding/WorkspaceSetupChecklist.tsx`: checklist
- `components/onboarding/FirstRunExperience.tsx`: layout entegrasyonu
- `components/onboarding/DashboardOnboardingEmptyState.tsx`: dashboard bos durumlari

## Backend Surface
- `backend/app/domains/onboarding/`
- `backend/app/api/v1/onboarding.py`
- `workspace_onboarding_state` migration
- Module readiness registry onboarding kaydi
- Action Center onboarding source itemlari

## Acceptance Criteria
- Ilk giriste welcome modal gorunur.
- Workspace state backendde tutulur.
- User tour/help state backendde tutulur.
- Baslangic Merkezi checklist calisir.
- Bos dashboard ilk sirket akisini onerir.
- Action Guide onboarding sorularini yanitlar.
- Action Center onboarding item gosterebilir.
- Build/typecheck/test bozulmaz.

## Known Gaps

Known gaps are tracked in [OnboardingKnownGaps.md](./OnboardingKnownGaps.md) and summarized in the final release gate risk list.
