# Multi-Company Scope Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Amaç

Company scope Eden ERP icinde kullanicinin hangi sirket, sube, tesis, personel, cari, proje ve servis kayitlarini gorebilecegini belirler. Tenant izolasyonu daha ust sinirdir; company scope tenant icindeki veri gorunurlugunu daraltir.

## Scope Kurallari

- Kullanici company scope disinda sirket goremez.
- Branch, facility ve organization unit kayitlari company scope'a baglanir.
- Partner, representative, employee, accounting, project ve service records company scope disinda listelenmez.
- Dashboard, KPI, global search, Action Center ve notifications company scope'u asamaz.
- Export, signed URL ve portal erisimi scope bypass araci olamaz.
- Portal user scope'u internal company scope ile karistirilmaz; customer/portal scope ayrica uygulanir.

## Kontrol Matrisi

| Alan | Beklenen scope | Kontrol |
| --- | --- | --- |
| Company list/detail | `company_id in company_scope_ids` | Company API ve UI smoke |
| Branch/facility | Parent company scope icinde | Branch/facility service review |
| Partner/ownership | Company scope + tenant scope | Ownership lifecycle tests |
| Representative | Company/branch authority scope | Representative policy tests |
| Employee/HR | Company scope + sensitive permission | HR sensitive view tests |
| Accounting | Company scope + accounting permission | Reconciliation/import/export tests |
| Project/task | Company scope + assignment/role | Task transition tests |
| Service/after-sales | Owning company/customer scope | Service request tests |
| Dashboard/report | Filter default company scope | KPI comparison fixture |
| Global search | Scope disi kayit dondurmez | Search cross-company test |
| Action Center | Scope disi is dondurmez | Pending work fixture |
| Notification | Hedef user scope icinde | Notification delivery review |
| Export | Scope disi satir yok | Export file diff |
| Portal | Customer-owned records only | Portal smoke |

## P0 Blockerlar

- Scope disi sirket, sube, cari, calisan, proje veya servis verisi gorunur.
- Export veya global search ile scope bypass olur.
- Notification scope disi kullaniciya veri tasir.
- Portal user internal admin/API endpointlerine veya baska musterinin verisine erisir.

## Test Senaryosu

1. Tenant icinde Company A ve Company B olustur.
2. Kullaniciya yalniz Company A okuma/yazma scope'u ver.
3. List, detail, search, dashboard, action center, export, document ve notification akisini calistir.
4. Company B kayitlari icin 403, 404 veya bos sonuc bekle.
5. Yazma mutasyonlarinda Company B id'si payload icinde gelse bile backend'in reddettigini dogrula.

## Release Karari

Company scope testleri gecmeden multi-company pilot disina cikilmaz. Scope kontrolu sadece UI gorunurluguyle sinirli kalirsa release `NOT_READY` sayilir.
