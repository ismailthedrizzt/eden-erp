# Customer Onboarding Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Yeni musteri ilk giris
1. Kullanici ilk kez giris yapar.
2. Welcome modal acilir.
3. Kullanici Kuruluma Basla der.
4. Baslangic Merkezi acilir.
5. Ilk sirket taslagi adimi one cikar.
6. `workspace_onboarding_state.status` `in_progress` olur.

## Scenario 2 - Sirket taslagi var
1. Kullanici dashboard'a gelir.
2. Sistem active sirket olmadigini gorur.
3. "Sirket acilisini tamamlayin" mesaji gosterilir.
4. Kullanici Sirket Acilisi sihirbazina gider.
5. Sihirbaz tamamlanmadan active sirket islemleri onerilmez.

## Scenario 3 - Active sirket sonrasi oneriler
1. Sirket active durumdadir.
2. Dashboard ortak, temsilci, sube, cari kart ve kullanici adimlarini onerir.
3. Baslangic Merkezi finish adimina yaklasir.
4. Onboarding tamamlaninca welcome tekrar otomatik acilmaz.

## Scenario 4 - Modul setup eksik
1. Module readiness `setup_required` doner.
2. Checklist readiness adimini warning yapar.
3. Kullanici Kurulum Merkezine yonlendirilir.
4. Admin Action Center'da onboarding/setup itemini gorur.

## Scenario 5 - Kullanici turu tamamlar
1. Kullanici genel sistemi tanir.
2. Tour state backend user preference icinde guncellenir.
3. Tur sonraki giriste otomatik acilmaz.
4. Yardim menusu uzerinden tekrar baslatilabilir.

## Scenario 6 - Yardimi sifirla
1. Kullanici Baslangic Merkezinden Yardimi Sifirla der.
2. `hasSeenGlobalTour`, welcome ve dismissed hint state temizlenir.
3. Tur tekrar baslatilabilir.

## Scenario 7 - Lisanssiz modul
1. Kullanici modul paketinde lisanssiz modul gorur.
2. Runtime visibility ve readiness engeli ayni dille gosterilir.
3. Modul Lisanslari veya Kurulum Merkezine yonlendirilir.

## Scenario 8 - Non-admin kullanici
1. Normal kullanici onboarding sayfasina girer.
2. Kendi tur ve yardim tercihlerini guncelleyebilir.
3. Tenant-level checklist step tamamlama istegi permission denied olur.
4. Teknik hata yerine yetki mesaji gosterilir.
