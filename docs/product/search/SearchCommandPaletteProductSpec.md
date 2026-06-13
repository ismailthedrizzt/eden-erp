# Search / Global Command Palette Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

Eden ERP icinde kullanicinin kayit, islem, gorev, belge, rapor, ayar ve yardim basliklarina menu gezmeden ulasmasini saglamak. Global Search metin aramasi, Command Palette ise arama + hizli islem deneyimidir.

## Kapsam

- Sirket, ortak, temsilci, sube, organizasyon, tesis, cari, calisan, proje/gorev, urun, kurulu urun, servis, paydas, belge ve audit kayitlari.
- Islemler: sirket olustur, sirket acilisi, sube ac/kapat, sermaye artirimi, ortak ekle, pay devri, temsilci yetkisi, cari kart, gorev, servis talebi, belge yukle, rapor ve kurulum merkezi.
- Platform sonuc gruplari: Kayitlar, Islemler, Gorevler ve Onaylar, Belgeler, Raporlar, Ayarlar, Yardim.
- Kullanici bazli son acilanlar.

## Search ve Action Guide Ayrimi

Global Search kayit, sayfa, ayar, rapor ve islem bulur. Action Guide kullanicinin "ne yapmak istiyorum?" sorusunu yorumlar ve uygun islem yolunu aciklar. Command Palette iki kaynagi tek hizli arayuzde birlestirir; action eligibility Action Guide/Policy ile ayni kurallardan gelir.

## Backend Modeli

FastAPI canonical endpointleri:

- `GET /api/v1/search`
- `POST /api/v1/search/query`
- `GET /api/v1/search/suggestions`
- `GET /api/v1/search/recent`
- `POST /api/v1/search/recent`
- `GET /api/v1/search/commands`
- `POST /api/v1/search/command-palette`
- `GET /api/v1/search/by-entity/{entity_type}/{entity_id}`

`SearchResult` alanlari: result type, entity type/id, module key, title, subtitle, status, badge, icon, target page, action key, confidence, matched fields, metadata, disabled reason.

## Provider Registry

Providerlar domain bazli calisir:

- Company, Partner, Representative, Branch
- Accounting, HR, Project/Task
- Product/After-Sales, CRM
- Document, Audit, Report, Module/Settings
- Action provider

Her provider permission/scope kontrolu uygular, tenant kapsamindan cikmaz ve limitli sorgu yapar. Provider hatasi tum aramayi kirmadan partial warning uretir.

## Ranking

Siralama onceligi:

1. Exact id/key/code/tax/identity/serial match
2. Exact title/name match
3. Prefix match
4. Contains match
5. Current page/context boost
6. Disabled action penalty

MVP ILIKE + exact lookup kullanir. Postgres FTS/fuzzy/semantic search future kapsamdadir.

## Security

- Sonuclar tenant scoped ve permission/scope kontrolludur.
- Yetkisiz audit, finans, HR sensitive veya dokuman sonucu gorunmez.
- Search query raw olarak audit/log zorunlu degildir; hassas sorgular loglanmaz.
- Recent item gosterilmeden once kullanici baglaminda tutulur; silinen/erisim disi kayitlar future cleanup kapsamindadir.

## UI Davranisi

- Header global search input.
- Ctrl/Cmd+K Command Palette acar.
- Mobilde full-screen modal.
- ESC kapatir, ok tuslari sonuc gezer, Enter secili sonucu acar.
- Son acilanlar ve hizli islemler bos/ilk durumda gosterilir.
- Disabled action reason gorunur.
- Action Guide kisa yolu Ctrl/Cmd+Shift+K olarak ayrilir.

## Next/BFF

Next route proxyleri FastAPI'ye gider; legacy fallback yoktur. `FASTAPI_BASE_URL` yoksa kontrollu hata: `Arama backend servisi yapilandirilmamis.`

## Readiness ve Feature Flags

Module: `search`

Required table:

- `user_recent_items`

Feature flags:

- `search.enabled`
- `search.commandPalette`
- `search.recentItems`

## Acceptance Criteria

- Ctrl/Cmd+K paleti acar.
- Kayit, action, rapor, ayar, belge ve recent item sonuclari gruplu gelir.
- Permission/scope filtreleri uygulanir.
- Action result eligibility ve disabled reason Action Guide ile uyumludur.
- Recent item yazma/okuma calisir.
- Next proxy contract ve FastAPI endpointleri OpenAPI'ye yansir.

## Known Gaps

Known gaps are tracked in [SearchKnownGaps.md](./SearchKnownGaps.md) and summarized in the final release gate risk list.
