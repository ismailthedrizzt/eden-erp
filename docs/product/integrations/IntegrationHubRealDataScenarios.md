# Integration Hub Real Data Scenarios

## Scenario 1 - Outbound webhook
1. Admin Integration Hub'da webhook app olusturur.
2. Sistem webhook secret'i bir kez gosterir.
3. `company.opened` icin abonelik eklenir.
4. Test webhook gonderilir.
5. Delivery listesinde `pending` veya `delivered` gorunur.

## Scenario 2 - Webhook failure retry
1. Target URL HTTP 500 dondurur.
2. Delivery `failed` olur.
3. Retry policy next attempt olusturur.
4. Max retry sonrasi status `dead_letter` olur.
5. Action Center admin/system warning gosterir.

## Scenario 3 - External service request inbound
1. Dis sistem `service_request_created_from_external` gonderir.
2. App aktif ve event allowed durumdadir.
3. Signature ve timestamp valid olur.
4. Customer/asset match bulunursa After-Sales service request olusur.
5. Match bulunamazsa inbound event `needs_review` olarak kalir.

## Scenario 4 - Invalid signature
1. Hatalı HMAC ile inbound webhook gelir.
2. Endpoint 401/403 seviyesinde reddeder.
3. Inbound event rejected olarak audit/security loga yansir.
4. Tekrarlayan hata admin warning uretir.

## Scenario 5 - Credential rotation
1. Admin credential rotate eder.
2. Yeni secret bir kez gosterilir.
3. Eski credential revoked olur.
4. Sonraki webhook signing yeni credential ile ilerler.

## Scenario 6 - Event subscription filter
1. Subscription yalniz `after_sales.service_request_created` dinler.
2. `crm.lead_created` eventinde delivery olusmaz.
3. Registry disi event request'i reddedilir.

## Scenario 7 - Permission guard
1. Normal kullanici `/sistem/entegrasyonlar` ekranina gider.
2. Permission yoksa UI/API erisimi engellenir.
3. Credential secret veya delivery payload gorunmez.
