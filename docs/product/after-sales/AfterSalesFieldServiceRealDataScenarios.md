# After-Sales Field Service Real Data Scenarios

## Scenario 1 - Periyodik bakim plani

1. PlaneGuard urunu veya kurulu urunu icin 90 gunluk bakim plani olusturulur.
2. `next_run_date` yaklastiginda due item olusur.
3. Kayit Bakimi Gelenler listesinde gorunur.

## Scenario 2 - Bakimdan servis talebi

1. Due item secilir.
2. Servis talebi olustur aksiyonu calisir.
3. Talep `request_type=maintenance` olur.
4. Due item `service_request_created` durumuna gecer.

## Scenario 3 - Teknisyen atama

1. Acik servis talebi secilir.
2. Teknisyen user veya employee atanir.
3. `after_sales_field_assignments` kaydi olusur.
4. Teknisyen Action Center ve Saha Gorevleri ekraninda gorevi gorur.

## Scenario 4 - Mobil servis

1. Teknisyen gorevi acar.
2. Gorevi kabul eder.
3. Servisi baslatir.
4. Checklist doldurur.
5. Fotograf yukler.
6. Servisi tamamlar.

## Scenario 5 - Garanti disi servis

1. Kurulu urunun garanti bitis tarihi gecmistir.
2. Warranty check `out_of_warranty` doner.
3. Servis kaydinda `warranty_covered=false` secilebilir.
4. Billable service warning future accounting icin hazir kalir.

## Scenario 6 - Kullanilan parca

1. Servis kaydinda `parts_used` JSON listesine batarya/filtre gibi malzeme girilir.
2. `billable` ve `warranty_covered` alanlari isaretlenir.
3. Inventory integration sonraki faz notu olarak kalir.

## Scenario 7 - Follow-up required

1. Servis sonucu `follow_up_required` secilir.
2. Complete endpoint Project/Task kaydi olusturabilir.
3. Task Action Center'da proje gorevi olarak gorunur.

## Scenario 8 - Servis raporu

1. Servis tamamlanir.
2. Report endpoint JSON/HTML preview doner.
3. PDF generation Known Gap olarak kalir.
