# Permission / Policy Engine Foundation

<!-- source-of-truth-standard: contract overrides markdown -->

Bu katman Eden ERP icinde "kullanici bu islemi yapabilir mi?" sorusunu tek bir karar modeline tasir.

## Sorumluluk Ayrimi

- Permission Registry: Hangi izin anahtarlarinin var oldugunu, hangi module ait olduklarini ve fallback izinlerini tanimlar.
- requirePermission: Mevcut basit ve geriye uyumlu tek izin kontroludur.
- requireAnyPermission: Birden fazla izin veya registry fallback izinlerinden herhangi biri varsa gecen server guard'dir.
- Access Context: Kullanici, tenant, company, branch, organization unit, facility, module, action ve permission bilgisini tek modelde toplar.
- Policy Engine: Module durumu, permission, tenant/company scope, alt scope, kayit durumu ve is kurallarini birlikte degerlendirir.
- Scope Policy: Company, branch, organization unit ve facility kapsamlarini merkezi kontrol eder.
- Action Eligibility: UI ve AI icin action'in gorulebilir ve baslatilabilir olup olmadigini hesaplar.

## Permission Registry

Kaynak dosya:

```txt
lib/security/permissionRegistry.ts
```

Registry `PermissionContract` listesi uzerinden calisir:

```ts
{
  key: string
  label: string
  moduleKey: string
  category?: 'view' | 'edit' | 'operation' | 'approval' | 'admin'
  fallback?: string[]
}
```

Ornek fallbackler:

- `branches.view` -> `companies.view`
- `branches.opening.start` -> `companies.edit`
- `representatives.authority.start` -> `representatives.edit`
- `partners.ownership.start` -> `partners.edit`

Registry camelCase istekleri de normalize eder. Ornek: `branches.openingStart`, sistem icinde `branches.opening.start` olarak cozulur.

## Server Permission Guard

Kaynak dosya:

```txt
lib/security/serverPermissions.ts
```

`requirePermission` eski davranisini korur. `requireAnyPermission` fallback destekli yeni guard'dir ve is diliyle hata doner:

```json
{
  "error": "Bu islemi yapmak icin gerekli yetkiniz bulunmuyor.",
  "code": "PERMISSION_DENIED",
  "details": {
    "required_permissions": ["branches.opening.start"],
    "checked_permissions": ["branches.opening.start", "companies.edit"]
  }
}
```

## Access Context

Kaynak dosya:

```txt
backend/app/policies/access_context.py
backend/app/core/security.py
```

Access Context, Policy Engine'e daginik parametreler yerine tek model verir:

```ts
{
  userId,
  tenantId,
  companyId,
  branchId,
  organizationUnitId,
  facilityId,
  moduleKey,
  actionKey,
  recordType,
  recordId,
  recordStatus,
  permissions,
  moduleStatus
}
```

FastAPI tarafinda Step 15 ile access context artik sadece proxy headerlarindan kurulmaz. Supabase JWT `sub` degeri user identity kaynagidir; `tenant_memberships` aktif uyelik kontrolu tenant'i dogrular; `user_roles` / `role_permissions` / `permissions` effective permission setini uretir. `X-Tenant-Id`, `X-User-Permissions` ve `X-Company-Scope` headerlari production'da sadece dogrulanmis JWT ve gerekiyorsa trusted proxy secret ile yardimci hint olarak kullanilir.

## Policy Engine

Kaynak dosya:

```txt
lib/security/policyEngine.ts
```

Policy Engine varsayilan olarak su kontrolleri yapar:

1. Modul mevcut tenant icin kullanilabilir mi?
2. Gerekli permission veya fallback permission var mi?
3. Tenant scope uygun mu?
4. Company scope uygun mu?
5. Branch, organization unit veya facility scope uygun mu?
6. Kayit durumu required/blocked status ile uyumlu mu?
7. Ek is kurallari engel uretiyor mu?

Karar formati:

```ts
{
  allowed: boolean
  code: string
  message: string
  reasons: string[]
  warnings: string[]
  requiredPermissions?: string[]
  checkedPermissions?: string[]
}
```

## Scope Policy

Kaynak dosya:

```txt
backend/app/policies/scope_policy.py
```

Bu katman asagidaki kontrolleri merkezilestirir:

- `canAccessCompany`, `canWriteCompany`
- `canAccessBranch`, `canWriteBranch`
- `canAccessOrganizationUnit`, `canWriteOrganizationUnit`
- `canAccessFacility`, `canWriteFacility`
- `assertSameCompanyScope`

Branch, organization unit ve facility icin tenant/company baglantisi merkezi kontrol edilir. Kapali/pasif alt kapsamlar yeni operasyonlar icin engellenir.

Company scope `tenant_company_scopes` tablosundan yuklenir. Production ortaminda scope bilgisi yoksa default deny uygulanir; local development'ta auth relax modunda gecici allow-all fallback kullanilabilir.

## Branch Policy

Kaynak dosya:

```txt
lib/security/policies/branchPolicies.ts
```

Ilk policy action seti:

- `branch.view`
- `branch.edit`
- `branch.openingStart`
- `branch.closingStart`
- `branch.documentsUpdate`

Branch opening aktif ve yazilabilir sirket ister. Branch closing aktif ve ayni sirkete bagli sube ister. Branch card edit resmi alan kilitlerini bozmadan company writable scope kontroluyle calisir.

## Representative Authority Scope Policy

Kaynak dosya:

```txt
lib/security/policies/representativeAuthorityPolicies.ts
```

Temsil yetkisi scope tipleri:

- `company_wide`
- `branch`
- `organization_unit`
- `facility`

Branch, unit ve facility scope secimlerinde kaydin ayni sirket altinda ve aktif olmasi zorunludur. Temsilci karti cogaltilmaz; farklilik authority transaction/current authority kapsaminda tutulur.

## Session Bootstrap

`/api/session/bootstrap` response'u geriye uyumlu kalir ve opsiyonel ozet alanlar doner:

- `permissions.effectivePermissions`
- `permissions.permissionFallbacks`
- `policy.availableModules`
- `policy.availableActions`

Bu alanlar UI ve AI Action Guide tarafinda asamali olarak kullanilabilir.

## FastAPI Canonical Layer

Python/FastAPI tarafinda `backend/app/policies/permissions.py`,
`policy_engine.py`, `scope_policy.py` ve `action_eligibility.py` eklendi.
Next.js policy/action eligibility route'lari FastAPI proxy/BFF rolundedir.
Detaylar: [Policy / Integrity / Readiness FastAPI Migration](./PolicyIntegrityReadinessFastAPIMigration.md).
