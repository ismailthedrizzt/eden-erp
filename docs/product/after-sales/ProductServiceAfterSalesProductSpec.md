# Product / Service / After-Sales Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

Urun/Hizmet ve Satis Sonrasi modulleri, satilan veya hizmet verilen urunleri katalog seviyesinde tanimlar; musteride kurulu gercek varliklari, garanti/bakim bilgisini, servis talebini ve servis mudahalesini izler.

Ana ilke: Urun katalogu satilabilir/hizmet verilebilir urunun tanimidir. Kurulu urun ise belirli bir musteride, belirli lokasyonda, belirli seri numarasiyla izlenen gercek varliktir.

## Kapsam

- Urun/Hizmet katalogu
- Kurulu urun / customer asset
- Servis talebi
- Servis kaydi / mudahale
- Garanti ve bakim alanlari
- Project/Task takip gorevi entegrasyonu
- Cari/accounting baglantisina hazir veri alanlari
- Belge, fotograf, rapor ve imza referans alanlari

Bu faz stok, uretim, fatura, tahsilat, mobil saha uygulamasi veya tam CRM yazmaz.

## Domain Siniri

Product/Service domain katalog, model, seri no gerekliligi, garanti suresi, bakim periyodu, teknik ozellik ve dokuman tanimlarini sahiplenir.

After-Sales domain kurulu urun, servis talebi, servis kaydi, garanti durumu, bakim takibi, saha ziyareti ve servis sonucunu sahiplenir.

Accounting fatura/tahsilat/cari hareketleri sahiplenir. Project/Task servis isinin takip gorevini sahiplenir; servis talebinin yerine gecmez.

## API

- `GET/POST /api/v1/products`
- `GET/PATCH/DELETE /api/v1/products/{product_id}`
- `GET /api/v1/products/summary`
- `GET/POST /api/v1/after-sales/assets`
- `GET/PATCH/DELETE /api/v1/after-sales/assets/{asset_id}`
- `GET /api/v1/after-sales/assets/{asset_id}/service-history`
- `GET/POST /api/v1/after-sales/service-requests`
- `GET/PATCH /api/v1/after-sales/service-requests/{request_id}`
- `POST /api/v1/after-sales/service-requests/{request_id}/assign`
- `POST /api/v1/after-sales/service-requests/{request_id}/close`
- `GET/POST /api/v1/after-sales/service-records`
- `GET/PATCH /api/v1/after-sales/service-records/{service_id}`
- `POST /api/v1/after-sales/service-records/{service_id}/complete`
- `GET /api/v1/after-sales/company/{company_id}/summary`
- `GET /api/v1/after-sales/maintenance-due`

## Kabul Kriterleri

1. Katalog kaydi olusturulur ve `after_sales_enabled` ile kurulu urun secimine hazir hale gelir.
2. Seri no zorunlu katalog kaydinda kurulu urun icin seri no validasyonu vardir.
3. Kurulu urun garanti bitisi ve garanti durumu hesaplanabilir.
4. Servis talebi olusturulur, atanir ve istege bagli project task baglanir.
5. Servis kaydi olusturulur ve tamamlaninca kurulu urunun son servis tarihi guncellenir.
6. Follow-up gerekli oldugunda Project/Task kaydi olusturma hazirligi vardir.
7. OpenAPI, Next proxy ve frontend servis sozlesmeleri gunceldir.

## Known Gaps

Known gaps are tracked in [AfterSalesKnownGaps.md](./AfterSalesKnownGaps.md) and summarized in the final release gate risk list.

Field service deepening is specified in [AfterSalesFieldServiceProductSpec.md](./AfterSalesFieldServiceProductSpec.md).


## Permissions

After-sales MVP uses module permissions for product catalog, installed assets, service requests, service records and service assignment. Sensitive customer/service history access remains scoped by tenant, company and role.
