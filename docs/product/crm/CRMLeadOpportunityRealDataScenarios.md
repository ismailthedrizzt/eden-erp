# CRM Lead Opportunity Real Data Scenarios

## Scenario 1 - Fuar lead'i

1. Kaynak `exhibition` ile SAHA EXPO lead'i olusturulur.
2. Ilgi alani PlaneGuard olarak girilir.
3. Sorumlu kullanici atanir.
4. `next_followup_date` belirlenir.
5. Takip tarihi geldiginde Action Center'da follow-up item gorunur.

## Scenario 2 - Lead qualification

1. Lead `contacted` durumundadir.
2. Kullanici lead'i `qualified` yapar.
3. Istenirse ayni akista opportunity olusturulur.

## Scenario 3 - Opportunity pipeline

1. Firsat Ihtiyac Analizi asamasindadir.
2. Teklif Hazirligi asamasina tasinir.
3. Teklif Gonderildi asamasina tasinir.
4. Probability ve weighted value guncellenir.

## Scenario 4 - Follow-up overdue

1. `next_followup_date` gecmistir.
2. Action Center urgent/warning item gosterir.
3. Kullanici etkilesim ekler ve takibi tamamlar.

## Scenario 5 - Won opportunity

1. Muzakere asamasindaki firsat kazanildi isaretlenir.
2. Bagli stakeholder active customer olur.
3. Cari kart onerisi ve after-sales asset future notu response'ta gorunur.

## Scenario 6 - Lost opportunity

1. Firsat kaybedildi isaretlenir.
2. `lost_reason` zorunludur.
3. Won/lost raporlarina yansir.

## Scenario 7 - Proposal document

1. Teklif belgesi document domain'de yuklenir.
2. `upload-proposal` ile opportunity'ye baglanir.
3. `proposal_status` sent olur.

## Scenario 8 - Duplicate lead

1. Ayni e-posta, telefon veya firma adi ile lead girilir.
2. Sistem mevcut lead/stakeholder adaylarini `duplicate_warnings` olarak dondurur.
