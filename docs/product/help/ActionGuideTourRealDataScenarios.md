# Action Guide + Tour Real Data Scenarios

## Scenario 1 - Ilk Kullanici Turu

1. Yeni kullanici giris yapar.
2. Backend user state `shouldShowSystemTour=true` doner.
3. Genel tur acilir.
4. `+ Ekle` taslak kayit, resmi sonuc doguran islerin wizard oldugu anlatilir.
5. Kullanici turu tamamlar veya tekrar gosterme der.
6. `hasSeenGlobalTour=true`, `lastTourVersion` ve tamamlanan adimlar backend preference icinde saklanir.
7. Sonraki giriste tur otomatik acilmaz.

## Scenario 2 - Sirket Adresi Kilitli

1. Aktif sirket detayinda `address` alani read-only gorunur.
2. Label yanindaki helper acilir.
3. Helper, adresin kart editinden degil Adres Degisikligi sihirbaziyla degisecegini soyler.
4. Aksiyon butonu baslatilabilir ise `address_change` wizard komutunu yayinlar.
5. Yetki veya kayit durumu uygun degilse disabled reason is diliyle gorunur.

## Scenario 3 - Sermaye Artirimi Neden Kapali

1. Ortaklarimiz modulu kapali veya current ownership hazir degildir.
2. Kullanici Action Guide'a "sermaye artirimi neden kapali" yazar.
3. Rehber `explain_capital_increase_setup` veya `capital_increase` intentini bulur.
4. Blocking reason Ortaklarimiz/readiness eksigini gosterir.
5. Onerilen aksiyon Kurulum Merkezi veya Modul Ayarlari olur.

## Scenario 4 - Sube Acma

1. Kullanici sirket detayindadir.
2. "sube acmak istiyorum" yazar.
3. Secili sirket aktifse `branch_opening` wizard onerilir.
4. Secili sirket taslaksa `branch_opening` disabled olur ve once `company_opening` onerilir.

## Scenario 5 - Pay Orani Neden Degismiyor

1. Ortak detayinda `share_ratio` kilitlidir.
2. Helper, pay oraninin kart editinden degil ownership transaction ile degistigini aciklar.
3. Kullanici Action Guide'a "pay orani neden degismiyor" yazar.
4. Rehber `share_transfer`, `initial_partnership_entry` veya ilgili ownership aksiyonlarini alternatif olarak gosterir.

## Scenario 6 - Temsilciye Banka Yetkisi

1. Kullanici temsilci detayinda "banka yetkisi verecegim" yazar.
2. Temsilcinin aktif yetkisi yoksa `representative_start` onerilir.
3. Aktif yetki varsa `representative_authority_scope_change` veya `representative_limit_change` onerilir.
4. Sube/organizasyon/tesis kapsaminda ilgili modul kapaliysa reason ve setup linki gorunur.

## Scenario 7 - Bekleyen Isler

1. Kullanici "bekleyen islerimi goster" yazar.
2. Rehber `view_pending_work` intentini bulur.
3. Onerilen aksiyon Action Center / Surec ve Is Merkezi sayfasini acar.
4. Gorev, onay ve sistem uyarilari kullanici scope'unda listelenir.

## Scenario 8 - Audit

1. Kullanici "bu kaydi kim degistirdi?" yazar.
2. Audit modulu ve `audit.view` yetkisi varsa Audit Timeline veya Denetim Izi sayfasi onerilir.
3. Yetki yoksa "Bu islem icin yetkiniz bulunmuyor." reason'i gosterilir.
4. Teknik log detayi yerine kayit, kullanici, zaman ve islem ozeti is diliyle sunulur.
