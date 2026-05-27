# Python Migration Roadmap

Bu roadmap FastAPI core backend gecisi icin ilk tasima sirasini belirler.

## P0

1. **Branch opening/closing** - in progress / first FastAPI implementation landed
   - Target: `backend/app/domains/branches`, `organization`, `facilities`
   - Reason: En yeni cross-domain mutation zinciri ve transaction boundary pilotu.
   - Implemented: `POST /api/v1/companies/{company_id}/branch-openings`, `POST /api/v1/companies/{company_id}/branch-closings`, precheck endpointleri ve Next BFF proxy.
   - Follow-up: TS legacy fallback'i kaldir, JWT/scope hardening ve DB integration testlerini ekle.

2. **Company official changes** - in progress / FastAPI implementation landed for title, address, public registration, NACE and activity subject
   - Target: `backend/app/domains/company`
   - Reason: Unvan, adres, kamu/tescil, NACE ve faaliyet konusu degisiklikleri resmi alanlari kontrol eder.
   - Implemented: `POST /api/v1/companies/{company_id}/official-changes/title-change`, `address-change`, `public-registration-update`, `nace-change`, `activity-subject-change` ve ilgili precheck endpointleri.
   - Follow-up: TS legacy fallback'i kaldir, public table sync integration testlerini ve Python company PATCH guard'ini ekle.

3. **Capital increase**
   - Target: `backend/app/domains/company`, `ownership`
   - Reason: Sirket sermayesi, ownership dagilimi ve lifecycle event zinciri atomic olmali.

4. **Representative authority transactions**
   - Target: `backend/app/domains/representatives`
   - Reason: Scope, limit, authority status ve branch/facility/organization iliskileri core domain kuralidir.

5. **Ownership transactions**
   - Target: `backend/app/domains/ownership`
   - Reason: Pay/oy/kar/sermaye haklari main partner card editinden ayrilmalidir.

## P1

6. **Process Engine**
   - Process instance/task/approval/event engine Python'a tasinir.

7. **Outbox Dispatcher**
   - Dispatcher ve handler runner Python worker olur.

8. **Audit Log**
   - Audit write/read service Python'a tasinir.

9. **Policy Engine**
   - Permission, scope, record status ve module readiness enforcement Python'a tasinir.

10. **Integrity Checks**
   - Cross-domain blocking/warning precheck katmani Python'a tasinir.

## P2

11. **Setup Readiness**
    - Module readiness Python startup/request guard olarak uygulanir.

12. **Action Center**
    - Unified pending work source Python API ve projection service'e tasinir.

13. **Projection services**
    - Read model query helpers Python'a veya DB view contract'a tasinir.

14. **Action Guide backend resolver**
    - Deterministic resolver ve eligibility Python'a tasinir; Next UI sadece client olur.

## Migration Rule

Her hedef icin once FastAPI endpoint + OpenAPI contract eklenir, sonra Next route proxy/adaptor'a cevrilir, son olarak TS business logic silinir veya `deprecated_wrapper` olarak planli sureyle tutulur.
