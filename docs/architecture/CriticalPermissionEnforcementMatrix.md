# Critical Permission Enforcement Matrix

## Amaç

Bu matris kritik mutation, admin, audit, export ve document endpointlerinde permission/policy enforcement icin production gate'tir. UI buton gizleme yeterli kabul edilmez; karar FastAPI policy layer'da verilmelidir.

## Enforcement Standardi

- Her kritik endpoint `require_access_context` ve module/domain permission kontrolu kullanir.
- Her mutation tenant ve company scope'u backend'de tekrar dogrular.
- Critical operation wizard/precheck olmadan direct mutation calismaz.
- Permission denied, scope denied ve critical success/failure auditlenir.
- Document download, signed URL ve export permission bypass araci olamaz.

## Matris

| Domain | Islem | Gerekli permission/policy | Scope | Audit | P0 gate |
| --- | --- | --- | --- | --- | --- |
| Company | opening | `companies.create`, wizard precheck | tenant + writable company | yes | mutation guard |
| Company | official changes | `companies.officialChanges` | company writable | yes | wizard-only |
| Company | capital increase/decrease | `companies.capital.manage` | company writable | yes | integrity guard |
| Company | liquidation | `companies.lifecycle.manage` | company writable | yes | critical confirmation |
| Company | deregistration | `companies.lifecycle.manage` | company writable | yes | critical confirmation |
| Ownership | initial partnership | `ownership.manage` | company writable | yes | atomic ownership update |
| Ownership | share transfer | `ownership.transfer` | company writable | yes | precheck + idempotency |
| Ownership | ownership exit | `ownership.exit` | company writable | yes | precheck + audit |
| Ownership | correction/reversal | `ownership.correct` | company writable | yes | reversal reason required |
| Representative | authority start | `representatives.authority.manage` | company/branch writable | yes | wizard/precheck |
| Representative | scope change | `representatives.authority.manage` | company/branch writable | yes | branch policy |
| Representative | limit change | `representatives.authority.manage` | company writable | yes | audit old/new |
| Representative | suspend/terminate | `representatives.authority.manage` | company writable | yes | effective date guard |
| Branch | opening | `branches.manage` | company writable | yes | official change guard |
| Branch | closing | `branches.manage` | company writable | yes | active dependency check |
| Branch | card update | `branches.manage` | company writable | yes | optimistic version |
| Accounting | transaction create/update | `accounting.transactions.manage` | company writable | yes | balanced/locked period guard |
| Accounting | reconciliation | `accounting.reconciliation.manage` | company writable | yes | idempotent match/unmatch |
| Accounting | export | `accounting.export` | company readable | yes | export audit |
| Accounting | bank/e-document import | `accounting.import` | company writable | yes | file validation |
| HR | employment start/terminate | `hr.employment.manage` | company writable | yes | sensitive masking |
| HR | leave approve | `hr.leave.approve` | company/manager scope | yes | approver scope |
| HR | timesheet lock | `hr.timesheet.lock` | company writable | yes | period lock |
| HR | sensitive view | `hr.sensitive.view` | company readable | read audit | mask fallback |
| Admin | users/roles | `system.admin` / `users.manage` | tenant | yes | no portal access |
| Admin | feature flags | `settings.modulesManage` | tenant | yes | audit + outbox |
| Admin | module activation | `settings.modulesManage` | tenant | yes | readiness precheck |
| Admin | integration credentials | `integrations.manageCredentials` | tenant | yes | secret once shown |
| Admin | audit export | `audit.export` / `system.admin` | tenant/company | yes | export audit |
| Admin | outbox retry | `outbox.dispatch` / `system.admin` | tenant | yes | manual retry audit |
| Documents | download | `documents.view` + owner policy | tenant/company/entity | access audit | signed URL scoped |
| Documents | signed URL | `documents.view` + owner policy | tenant/company/entity | access audit | no raw path leak |
| Documents | verify/reject | `documents.verify` | tenant/company/entity | yes | immutable decision trail |
| Documents | delete | `documents.delete` | tenant/company/entity | yes | soft delete preferred |

## P0 Blockerlar

- Mutation endpoint permission check olmadan calisir.
- Admin, audit export veya outbox retry yetkisiz erisilebilir.
- Document download/signed URL permission veya tenant scope bypass eder.
- Critical operation AI, BFF veya import/export ile backend policy disindan tetiklenir.

## Review Procedure

1. OpenAPI path listesini bu matrisle eslestir.
2. Her POST/PATCH/DELETE icin permission, tenant, company scope ve audit evidence kaydet.
3. En az bir negative test yaz: permission yok, company scope disi, tenant disi.
4. Export/download endpointleri icin dosya icerigi ve URL scope dogrulamasini dahil et.
