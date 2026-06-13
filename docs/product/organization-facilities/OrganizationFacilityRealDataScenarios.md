# Organization / Facility Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Şube Açılışıyla Organization Unit

1. Aktif şirket seçilir.
2. Şube Açılışı wizardında `create_organization_unit = true` seçilir.
3. İşlem tamamlanır.
4. Teşkilat/Kadro ağacında unit görünür.
5. Unit detayında ilişkili şube ve “Şube Açılışı ile oluştu” bilgisi izlenir.

## Scenario 2 - Normal Departman Oluşturma

1. Teşkilat/Kadro sayfasında şirket seçilir.
2. Yeni birim oluşturulur.
3. Parent aynı şirket altında seçilir.
4. Tree view’da yeni departman görünür.

## Scenario 3 - Cycle Engeli

1. Birim kendi altına veya kendi alt ağacındaki birime taşınmaya çalışılır.
2. FastAPI `ORGANIZATION_UNIT_CYCLE` döner.
3. Kullanıcıya iş diliyle cycle hatası gösterilir.

## Scenario 4 - Pozisyon Tanımlama

1. Aktif organization unit açılır.
2. Pozisyon eklenir.
3. Planlanan ve mevcut kadro değerleri girilir.
4. Kadro summary güncellenir.

## Scenario 5 - Şube Kapanışında Unit Keep Open

1. Şube Kapanışı wizardında `organization_unit_action = keep_open` seçilir.
2. Şube kapanır.
3. Unit aktif kalır ve detayda kapalı şube uyarısı görünür.

## Scenario 6 - Şube Açılışıyla Facility

1. Şube Açılışı wizardında `create_facility = true` seçilir.
2. İşlem tamamlanır.
3. Tesisler/Lokasyonlar sayfasında facility görünür.

## Scenario 7 - Serbest Facility Create

1. Tesisler/Lokasyonlar sayfasından depo/ofis oluşturulur.
2. Şube bağlantısı opsiyonel bırakılır.
3. Facility şube olarak görünmez.

## Scenario 8 - Facility Reuse

1. Şube Kapanışı wizardında `facility_action = reuse` seçilir.
2. Lokasyon açık kalır.
3. Tesisler/Lokasyonlar listesinde reusable badge görünür.

## Scenario 9 - Facility Scoped Authority

1. Temsilcilerimiz modülünde facility scope yetki verilir.
2. Facility detayında yetki read-only görünür.

## Scenario 10 - Deactivate Impact

1. Aktif branch veya authority bağlı facility kapatılmak istenir.
2. Impact endpoint aktif bağlantıları döndürür.
3. Kullanıcıya önce ilişkili şube/yetki etkisi gösterilir.
