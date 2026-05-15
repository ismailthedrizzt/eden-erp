# ERP Access, Module Dependency and Workflow Architecture

Bu kontrat yeni ERP sayfalarinin kucuk, orta ve buyuk firma senaryolarinda ayni mimariyle calismasi icin kullanilir.

## 1. Module Dependency

Sayfa veya alan baska bir modulden besleniyorsa form/list crash etmez ve alan tamamen kaybolmaz.

- Modul kapaliysa kullaniciya standart mesaj gosterilir: `Bu alandan yararlanabilmek icin X modulunu etkinlestirmeniz gerekir.`
- Alan okuma/yazma API'leri bagimli modul kapaliyken zorunlu query yapmaz.
- Yeni alanlar icin `ModuleDependencyGate` veya `EntityForm moduleDependencies` kullanilir.

```tsx
<ModuleDependencyGate dependency={{ module: 'organization', label: 'Teskilat ve Kadro', reason: 'Birim ve kadro secimi icin gereklidir.' }}>
  <OrganizationFields />
</ModuleDependencyGate>
```

## 2. Permission Layers

Kucuk firmalarda legacy allow-all veya tek rol yeterlidir. Orta ve buyuk firmalarda sayfa/form yetkileri su aksiyonlara bolunur:

- `view`: listeyi ve formu gorebilir.
- `insert`: yeni kayit acabilir.
- `edit`: mevcut kaydi guncelleyebilir.
- `approve`: workflow/onay ekraninda karar verebilir.
- `passivate`: kaydi pasife alabilir veya aktive edebilir.
- `export`: listeyi disa aktarabilir.

Yeni sayfalarda `useEntityAccess` kullanilir:

```ts
const access = useEntityAccess({
  module: 'employees',
  moduleLabel: 'Insan Kaynaklari',
  resource: 'employees',
  permissions: {
    view: 'employees.view',
    insert: 'employees.insert',
    edit: 'employees.edit',
    approve: 'employees.approve',
    passivate: 'employees.passivate',
    export: 'employees.export',
  },
})
```

## 3. Workflow Layer

Buyuk firmalarda form kaydi direkt uygulanmayabilir. `decideWorkflowRoute` kaydin direkt mi yazilacagina, yoksa onay akisina mi gidecegine karar verir.

```ts
const decision = decideWorkflowRoute(formMode, access, {
  enabled: true,
  workflowKey: 'ik.personel',
  approvalPermission: 'employees.approve',
  interceptActions: ['create', 'update', 'passivate'],
})
```

`shouldRouteToWorkflow` true ise endpoint dogrudan tabloyu update etmek yerine `workflow_requests` kaydi olusturur. Approver resolver ilerleyen fazda Teskilat/Kadro ve rol atamalarindan onay makamlarini belirler.

## Template Rule

Yeni `EntityForm` sayfalari asgari su yapiyi tasir:

```tsx
<EntityForm
  access={access}
  moduleDependencies={access.missingDependencies}
  loadStages={formLoadStages}
  canCreate={access.canInsert}
  canEdit={access.canEdit}
/>
```

Backend route'lar frontend yetkisine guvenmez; mutasyon endpointleri `requirePermission` ile ilgili permission key'i tekrar kontrol eder.
