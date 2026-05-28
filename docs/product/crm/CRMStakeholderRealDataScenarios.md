# CRM Stakeholder Real Data Scenarios

## Scenario 1 - Yeni musteri kurum

1. Tuzel kisi secilir.
2. VKN girilir.
3. Master organization lookup calisir.
4. Yeni kurum olusturulur veya mevcut kurum secilir.
5. stakeholder_type customer olarak kaydedilir.
6. Cari kart olustur secilir.
7. Musteri + cari baglantisi olusur.

## Scenario 2 - Tedarikci

1. Tuzel kisi/VKN ile lookup yapilir.
2. stakeholder_type supplier secilir.
3. Cari kart olusturulur.
4. Muhasebe Cari Kartlar listesinde gorunur.

## Scenario 3 - Muhasebeci paydas

1. stakeholder_type accounting_firm secilir.
2. Cari kart olusturma opsiyonel kalir.
3. Sirket detail paydas ozeti future panelinde gorunebilir.

## Scenario 4 - Lead

1. stakeholder_type lead secilir.
2. lead_source fuar olarak girilir.
3. next_followup_date girilir.
4. Follow-up task olusturulur.

## Scenario 5 - Ayni kurum duplicate engeli

1. Ayni VKN ile tekrar musteri acilmak istenir.
2. Sistem mevcut master kaydi onerir.
3. Ayni company altinda ayni stakeholder_type icin duplicate role kaydi engellenir.

## Scenario 6 - Musteri kurulu urun

1. Musteri stakeholder kaydi vardir.
2. Kurulu urun olusturulur.
3. After-Sales detailde musteri/cari baglantisi gorunur.

## Scenario 7 - Paydas gorev

1. Paydas detailden gorev olusturulur.
2. related_module crm, related_entity_type stakeholder olur.
3. Action Center ve Project/Task listesinde gorunur.

## Scenario 8 - Ortak/temsilci iliskili kisi

1. Ayni master person partner veya representative olarak vardir.
2. Paydas detail "Iliskili Roller" panelinde rol sayilari gorunur.
