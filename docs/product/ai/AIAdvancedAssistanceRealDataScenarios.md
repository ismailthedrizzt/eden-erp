# AI Advanced Assistance Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Sirket ozeti

1. Kullanici aktif sirket detayinda Copilot'u acar.
2. `record_summary` modu sirket durumu, ortaklik, temsilci, sube ve pending action ozetini ister.
3. Copilot scope dahilindeki ozetleri dondurur.
4. Uygun action varsa sirket/sube wizard yonlendirmesi gosterilir.

## Scenario 2 - Kilitli sermaye alani

1. Kullanici "sermayeyi degistirmek istiyorum" der.
2. Copilot normal patch yapilamayacagini aciklar.
3. Sermaye artirimi/azaltimi wizard action'i registry'de varsa yonlendirme onerir.
4. Readiness eksikse blocking reason backend sonucundan gelir.

## Scenario 3 - Cari hareket form assist

1. Kullanici "Fotografciya 500 TL sahsi odeme, belge aranacak" yazar.
2. Form assist transaction type, amount, currency, payment method ve document status onerir.
3. Kullanici alanlari duzenler.
4. Submit mevcut muhasebe endpoint validation'i ile yapilir.

## Scenario 4 - Belge ozetleme

1. Kullanici document detail uzerinde belge zekasini acar.
2. Sistem belge text/metadata context'ini permission kontroluyle toplar.
3. Copilot belge turu, ozet, tarih ve tutar onerilerini dondurur.
4. Kullanici onerileri dogrular veya reddeder.

## Scenario 5 - Servis talebi taslagi

1. Kullanici "PlaneGuard cihazinda goruntu yok, acil" yazar.
2. Form assist service request icin fault/high priority/subject/description onerir.
3. Kullanici taslagi onaylar.
4. Backend servis talebi validation'i mutation'i yapar.

## Scenario 6 - Yetkisiz audit sorusu

1. Kullanici "bu kaydi kim degistirdi?" der.
2. `audit.view` yoksa context builder audit detayini toplamaz.
3. Copilot permission reason ile sinirli cevap verir.
4. Audit detaylari gosterilmez.

## Scenario 7 - Admin setup assist

1. Admin "sermaye artirimi neden calismiyor?" diye sorar.
2. Copilot module readiness ve disabled action reason'larini ozetler.
3. Eksik readiness tablo/feature/permission listesi gosterilir.

## Scenario 8 - AI action safety

1. Kullanici "subeyi hemen kapat" der.
2. Action resolver critical operation olarak isaretler.
3. Copilot direct execution yapmaz.
4. Sadece Sube Kapanisi wizard'ina navigate/prepare onerisi sunar.
