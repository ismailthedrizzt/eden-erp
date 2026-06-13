# After-Sales Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Servis verilebilir urun tanimi

1. Urun katalogunda PlaneGuard olusturulur.
2. `serial_required=true`, `warranty_months=24`, `after_sales_enabled=true` secilir.
3. Kayit kurulu urun formunda secilebilir hale gelir.

## Scenario 2 - Musteride kurulu urun

1. Musteri cari karti veya musteri adi secilir.
2. PlaneGuard kurulu urun kaydi olusturulur.
3. Seri no ve kurulum tarihi girilir.
4. Garanti bitisi katalog garanti ayina gore hesaplanir.

## Scenario 3 - Ariza talebi

1. Kurulu urun icin servis talebi acilir.
2. Priority `high` secilir.
3. Teknisyen veya user atanir.
4. `create_project_task=true` ise Action Center tarafinda project task olarak gorunebilir.

## Scenario 4 - Servis kaydi

1. Servis talebinden servis kaydi olusturulur.
2. Mudahale bilgileri, fotograf ve rapor referanslari girilir.
3. Servis tamamlanir.
4. Kurulu urunun `last_service_date` alani guncellenir.

## Scenario 5 - Bakim zamani

1. Bakim gereken urun icin `next_maintenance_date` yaklasir.
2. Kayit Bakimi Gelenler listesinde gorunur.

## Scenario 6 - Garanti disi servis

1. Kurulu urun garanti disidir.
2. Servis kaydinda `warranty_covered=false` isaretlenir.
3. Faturalama/cari hareket future entegrasyon icin hazir kalir.

## Scenario 7 - Takip gorevi

1. Servis sonucu `follow_up_required` olur.
2. Servis kaydi tamamlama aksiyonu takip taski olusturabilir.
3. Task `related_module=after_sales` ile baglanir.
