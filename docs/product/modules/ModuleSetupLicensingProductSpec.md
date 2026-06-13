# Module Setup / Licensing Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Purpose

Kurulum Merkezi, modül lisansları, feature flags ve runtime visibility kararlarını kullanıcıya iş diliyle gösterir. Kullanıcı bir modülün neden görünmediğini, neden kapalı olduğunu veya hangi kurulum adımını beklediğini teknik tablo/RPC dili görmeden anlayabilmelidir.

## Scope

- Modül durum modeli: available, disabled, unlicensed, setup_required, dependency_missing, feature_disabled.
- Kurulum Merkezi: modül kartları, özet sayaçları, setup steps, blocking/warning ayrımı.
- Module Licenses UI: modül aktifliği, lisans dili, alt modüller, feature flags.
- Runtime Visibility: Sidebar, operation buttons, field helper ve Action Guide aynı reason dilini kullanır.
- FastAPI: `/api/v1/modules`, `/api/v1/features`, `/api/v1/setup/readiness`, action eligibility feature-disabled enforcement.

## User Roles

- Admin/settings.modulesManage: modül aktivasyonu ve feature flag değişikliği yapabilir.
- settings.view: kurulum ve lisans durumunu görebilir.
- Normal kullanıcı: kendi işlemini etkileyen unavailable state ve yönlendirme mesajlarını görür.

## Status Language

| status | user message |
| --- | --- |
| available | Kullanıma hazır |
| disabled | Bu modül çalışma alanınızda aktif değil |
| unlicensed | Bu modül lisansınızda bulunmuyor |
| setup_required | Bu modülün kurulumu tamamlanmamış |
| dependency_missing | Bu işlem için gerekli modül aktif değil |
| feature_disabled | Bu özellik şu anda kapalı |

## Feature Flags

Başlangıç flag listesi:

- `actionGuide.enabled`
- `guidedTour.enabled`
- `processEngine.enabled`
- `auditLog.enabled`
- `actionCenter.enabled`
- `branches.facilityAutoCreate`
- `branches.organizationAutoCreate`
- `branches.documentUpdate`
- `representatives.scopeAuthority`
- `facilities.freeCreate`
- `organization.positionManagement`
- `audit.export`
- `process.approvals`
- `process.tasks`

## UX Rules

- Teknik altyapı isimleri normal kullanıcıya gösterilmez.
- Disabled buton sessiz kalmaz; tooltip/helper sebep ve aksiyon verir.
- Setup page default olarak ürün durumu gösterir, admin debug ileride ayrı açılır.
- Feature flag kapalıysa UI disabled reason gösterir ve FastAPI eligibility aynı kodu döner.

## Acceptance Criteria

- Kurulum Merkezi ürün seviyesinde modül durumlarını gösterir.
- Module Licenses UI feature flags ve lisans dilini gösterir.
- `ModuleUnavailableState` status bazlı default mesaj ve aksiyon üretir.
- FastAPI modules/features endpointleri OpenAPI contract içine girer.
- Action Guide kurulum/lisans/feature sorularına cevap verir.

## Known Gaps

Known gaps are tracked in [ModuleSetupLicensingKnownGaps.md](./ModuleSetupLicensingKnownGaps.md) and summarized in the final release gate risk list.


## Permissions

Module setup, licensing and feature flag changes require setup/admin permissions. Risky feature changes are audited and should be limited to system/admin roles.
