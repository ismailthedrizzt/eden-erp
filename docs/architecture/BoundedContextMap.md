# Bounded Context Map

Eden ERP'de entity sahipligi domain bazinda belirlenir. Baska domain'in sahip oldugu veri dogrudan guncellenmez; domain service, operation orchestrator veya event/projection yoluyla etkilesim kurulur.

## Harita

```text
                         +-----------------------------+
                         | Setup / Module Runtime      |
                         | readiness, license, guard   |
                         +--------------+--------------+
                                        |
                                        v
+----------------+     +----------------+     +------------------------------+
| AI Action      |<--->| Action Center  |<--->| Process Domain               |
| Guide Domain   |     | Notifications  |     | instances, tasks, approvals  |
+-------+--------+     +-------+--------+     +--------------+---------------+
        |                      |                             |
        v                      v                             v
+-------+--------+     +-------+--------+     +--------------+---------------+
| Company Domain |<--->| Branch Domain |<--->| Representative Authority     |
| legal company  |     | branches      |     | card + scoped authorities    |
+-------+--------+     +-------+--------+     +--------------+---------------+
        |                      |                             |
        v                      v                             v
+-------+--------+     +-------+--------+     +--------------+---------------+
| Ownership      |     | Organization  |<--->| Facility / Location          |
| partners,      |     | hierarchy,    |     | physical places              |
| transactions   |     | positions     |     |                              |
+-------+--------+     +-------+--------+     +--------------+---------------+
        |                      |                             |
        v                      v                             v
+-------+--------+     +-------+--------+     +--------------+---------------+
| Accounting     |     | HR Domain     |     | Project / Task Domain        |
| payments,      |     | employees,    |     | business work                |
| reconciliation |     | assignments   |     |                              |
+-------+--------+     +-------+--------+     +--------------+---------------+
        |                      |                             |
        +----------------------+-------------+---------------+
                                           |
                                           v
                         +-----------------+----------------+
                         | Platform Cross-Cutting Domains   |
                         | Document, Audit, Outbox,         |
                         | Projection, Integrity            |
                         +----------------------------------+
```

## Ana Yonler

- Company Domain sirket tuzel kisiliginin ana kaydidir.
- Ownership Domain ortak karti, ortaklik islemi ve guncel pay dagilimini sahiplenir.
- Representative Authority Domain temsilci karti ve scope'lu yetki transaction'larini sahiplenir.
- Branch Domain sirket subelerini sahiplenir; sube sirket, facility veya organization unit degildir.
- Organization Domain hiyerarsi ve kadroyu sahiplenir.
- Facility / Location Domain fiziksel lokasyonlari sahiplenir.
- Accounting Domain sermaye odeme/tahsilat mutabakatini sahiplenir; sermaye artirimi kararini sahiplenmez.
- HR Domain calisan ve istihdam lifecycle'ini sahiplenir.
- Project / Task Domain is gorevlerini sahiplenir; process task'lari sahiplenmez.
- Process Domain adim, gorev ve onay yonetir; business mutation yapmaz.
- Audit, Outbox, Projection, Integrity, Setup ve Action Guide platform domainleridir.

## Iletisim Kurallari

| Kaynak | Hedef | Dogru Yol |
| --- | --- | --- |
| Branch Domain | Organization Domain | Domain Service veya Orchestrator |
| Branch Domain | Facility Domain | Domain Service veya Orchestrator |
| Company Domain | Ownership Domain | Orchestrator + Domain Service |
| Representative Domain | Branch/Organization/Facility | ScopePolicy + Integrity Check + Read Model |
| Ownership Domain | Accounting Domain | Outbox Event + Reconciliation Action |
| Process Domain | Business Domain | Operation step -> Operation Orchestrator |
| Outbox Domain | Projection/Notification/Audit/AI | Event Handler |

## Sinir Kontrol Hazirligi

`lib/domains/domainOwnershipRegistry.ts` entity, tablo ve operation ownership bilgisini tutar. `lib/domains/domainBoundaryGuard.ts` cross-domain yazma denemeleri icin allowed path kararini hazirlar.

Allowed path'ler:

- `domain_service`
- `orchestrator`
- `event`
- `projection`
- `integrity_check`

`direct` sadece ayni domain icinde guvenli kabul edilir.
