# Security / RBAC / Permission Matrix Product Spec

## Amac

Security/RBAC calismasi Eden ERP'de kullanici, rol, permission, company/branch scope ve policy kararlarini musteri ortaminda yonetilebilir ve denetlenebilir hale getirir.

Ana ilke: Yetki sadece menu veya buton gizleme degildir. Backend her kritik islemde permission, scope, modul durumu, kayit durumu ve policy kontrolunu enforce eder. Frontend yalnizca kullanici deneyimini sadeleştirir.

## Kavramlar

- Authentication: kullanicinin kim oldugunu Supabase Auth/JWT ile dogrular.
- Tenant: her verinin `tenant_id` ile izole edildigi calisma alanidir.
- Role: kullaniciya atanan yetki grubudur.
- Permission: tekil gorunum, edit, operation, approval veya admin yetkisidir.
- Scope: kullanicinin hangi sirket, sube, organizasyon veya facility kayitlarini gorecegini/degistirecegini belirler.
- Policy: permission + scope + modul/readiness + kayit durumu + is kuralinin sonucudur.
- Runtime visibility: UX'i sadeleştirir; backend yetkisini degistirmez.

## Kapsam

MVP kapsaminda su deneyimler vardir:

- Kullanici listesi ve detay ozeti
- Kullaniciya rol atama ve kaldirma
- Kullaniciya sirket/sube scope atama
- Varsayilan rol seti
- Ozel rol olusturma
- Role permission atama
- Modul bazli permission matrix
- Kritik permission uyarisi
- Kullanici erisim onizlemesi
- Policy test araci
- Permission/scope denial raporu
- Permission ve scope degisikliklerini audit icin olaylastirma hazirligi

Kapsam disi: SSO/SAML/LDAP, MFA yonetim ekrani, password policy UI, gecici delege yetki, approval-based permission change, advanced ABAC.

## Varsayilan Roller

Varsayilan roller `backend/app/domains/security/roles.py` icinde urun kontrati olarak tanimlidir:

- Sistem Yoneticisi
- Sirket Yoneticisi
- Muhasebe Kullanicisi
- IK Kullanicisi
- Operasyon Kullanicisi
- Denetci
- Standart Kullanici
- Dis Kullanici / Musteri Portali future

Sistem rolleri DB yokken de okunabilir. DB hazir oldugunda ozel roller ve role_permissions tablolari canonical hale gelir.

## Permission Matrix

Matrix satirlari permission/action anahtarlaridir; kolonlar rollerdir. Permission listesi canonical registry'den gelir. DB'ye registry disi permission kaydedilemez.

Riskli permissionlar UI'da badge ve uyari ile gosterilir:

- `security.usersManage`
- `security.rolesManage`
- `security.scopesManage`
- `settings.modulesManage`
- `audit.export`
- `outbox.dispatch`
- `companies.deregistrationStart`
- `partners.ownershipReverse`
- `representatives.authorityTerminate`
- `accounting.export`
- `system.admin`

## Scope

Scope tipleri:

- `all_companies`
- `assigned_companies`
- `assigned_branches`
- `organization_unit_scope`
- `own_tasks_only`
- `read_only`
- `custom`

Kullanici detayinda sirket ve sube icin `can_view`, `can_edit`, `can_operate` ayrimi tutulur. Role sahip olmak tek basina kayit erisimi anlamina gelmez.

## Policy Test

Admin araci su soruyu cevaplar: "Kullanici X, kayit Y uzerinde islem Z yapabilir mi?"

Girdi:

- kullanici
- action veya permission
- modul
- company/sube
- record type/id/status

Cikti:

- allowed/denied
- permission sonucu
- scope sonucu
- module sonucu
- policy sonucu
- kullanici diliyle nedenler

## UI Yapisi

Sayfalar:

- `/app/sistem/kullanicilar`
- `/app/sistem/roller`
- `/app/sistem/yetkiler`

Ana component: `components/modules/security/SecurityRbacAdminPage.tsx`

Sayfa deneyimi:

- Kullanici listesi
- Rol atama/kaldirma
- Sirket/sube scope selector
- Ozel rol olusturma
- Role permission editor
- Modul bazli matrix
- Policy test paneli
- Risk badge ve disabled reason

## API Endpoints

- `GET /api/v1/security/users`
- `GET /api/v1/security/users/{user_id}`
- `PATCH /api/v1/security/users/{user_id}`
- `GET /api/v1/security/users/{user_id}/roles`
- `POST /api/v1/security/users/{user_id}/roles`
- `DELETE /api/v1/security/users/{user_id}/roles/{role_id}`
- `GET /api/v1/security/roles`
- `POST /api/v1/security/roles`
- `GET /api/v1/security/roles/{role_id}`
- `PATCH /api/v1/security/roles/{role_id}`
- `DELETE /api/v1/security/roles/{role_id}`
- `GET /api/v1/security/permissions`
- `GET /api/v1/security/permissions/matrix`
- `PATCH /api/v1/security/roles/{role_id}/permissions`
- `GET /api/v1/security/users/{user_id}/scopes`
- `PATCH /api/v1/security/users/{user_id}/scopes`
- `POST /api/v1/security/policy-test`
- `GET /api/v1/security/permission-denials`
- `GET /api/v1/security/access-summary`

Next proxy routes `/api/security/*` altinda proxy-only adapter olarak calisir.

## Data Model

Migration: `backend/migrations/versions/20260528_1500_security_rbac_foundation.py`

Tablolar:

- `security_users_profile`
- `security_roles`
- `security_role_permissions`
- `security_user_roles`
- `security_user_company_scopes`
- `security_user_branch_scopes`
- `security_policy_test_logs`

Supabase Auth users dogrudan yonetilmeyebilir; bu tablolar uygulama-level profil, rol ve scope katmanidir.

## Acceptance Criteria

- Kullanici/rol/yetki yonetimi urun seviyesinde calisir.
- Permission matrix modul bazli gorunur.
- Varsayilan roller tanimlidir.
- Company/branch scope yonetimi calisir.
- Effective permission ve policy test araci calisir.
- Backend permission/scope enforcement P0 endpointlerde aktif olacak sekilde context loader yeni tablolari okur.
- Runtime visibility permission ile uyumludur.
- Permission/scope degisiklikleri auditlenmeye hazirdir.
- FastAPI endpoint coverage ve Next proxy coverage gunceldir.
