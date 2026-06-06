# Route And Navigation Simplification Report

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Release Registry Durumu

- `npm run release:check`: PASS.
- Registry route: 146.
- Page route: 146.
- Release visibility helpers: `lib/release/routeReleaseRegistry.ts`, `lib/release/releaseVisibility.ts`.

## Alias / Navigation Debt

| alias route | canonical route | file/path | kullanıcıya görünür mü? | silinebilir mi? | release riski |
| --- | --- | --- | --- | --- | --- |
| /ayarlar/bildirimler | /app/sistem/* | app/app/ayarlar/bildirimler/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /crm/paydaslar | /app/sirket/companies/stakeholders or CRM/paydaslar decision | app/app/crm/paydaslar/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /ik/personel/[id] | TBD | app/app/ik/personel/[id]/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /ik/personel | /app/ik/calisanlar | app/app/ik/personel/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /ik/personel-ekle | TBD | app/app/ik/personel-ekle/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/banka-hareketleri | /app/muhasebe/* | app/app/muhasebe/banka-hareketleri/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/banka-hesaplari | /app/muhasebe/* | app/app/muhasebe/banka-hesaplari/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/banka-hesaplari-ve-kartlari | /app/muhasebe/* | app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/banka-kart-hareketleri | /app/muhasebe/* | app/app/muhasebe/banka-kart-hareketleri/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/borclar | /app/muhasebe/* | app/app/muhasebe/borclar/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/cari-hareketler | /app/muhasebe/* | app/app/muhasebe/cari-hareketler/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/cari-kartlar | /app/muhasebe/* | app/app/muhasebe/cari-kartlar/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/dashboard | /app/muhasebe/* | app/app/muhasebe/dashboard/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/e-fatura-e-arsiv | /app/muhasebe/* | app/app/muhasebe/e-fatura-e-arsiv/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/hesap-ve-kart-hareketleri | /app/muhasebe/* | app/app/muhasebe/hesap-ve-kart-hareketleri/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/hesaplar | /app/muhasebe/* | app/app/muhasebe/hesaplar/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/islemler | /app/muhasebe/* | app/app/muhasebe/islemler/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/mutabakat | /app/muhasebe/* | app/app/muhasebe/mutabakat/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/on-muhasebe-hareketleri | /app/muhasebe/* | app/app/muhasebe/on-muhasebe-hareketleri/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe | /app/muhasebe/* | app/app/muhasebe/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/projeler | /app/muhasebe/* | app/app/muhasebe/projeler/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/sermaye-mutabakati | /app/muhasebe/* | app/app/muhasebe/sermaye-mutabakati/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /sirket/companies/stakeholders | /app/sirket/companies/stakeholders or CRM/paydaslar decision | app/app/sirket/companies/stakeholders/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /sirket/paydaslar | /app/sirket/companies/stakeholders or CRM/paydaslar decision | app/app/sirket/paydaslar/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /ayarlar/entegrasyon-ayarlari | /app/sistem/* | app/ayarlar/entegrasyon-ayarlari/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /ik/personel | /app/ik/calisanlar | app/ik/personel/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/banka-hesaplari-ve-kartlari | /app/muhasebe/* | app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/banka-kart-hareketleri | /app/muhasebe/* | app/muhasebe/banka-kart-hareketleri/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/cari-hareketler | /app/muhasebe/* | app/muhasebe/cari-hareketler/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/cari-kartlar | /app/muhasebe/* | app/muhasebe/cari-kartlar/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/hesap-ve-kart-hareketleri | /app/muhasebe/* | app/muhasebe/hesap-ve-kart-hareketleri/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe/on-muhasebe-hareketleri | /app/muhasebe/* | app/muhasebe/on-muhasebe-hareketleri/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /muhasebe | /app/muhasebe/* | app/muhasebe/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal/dashboard | TBD | app/portal/dashboard/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal/documents | TBD | app/portal/documents/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal | TBD | app/portal/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal/products/[id] | TBD | app/portal/products/[id]/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal/products | TBD | app/portal/products/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal/profile | TBD | app/portal/profile/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal/service-records | TBD | app/portal/service-records/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal/service-requests/[id] | TBD | app/portal/service-requests/[id]/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /portal/service-requests | TBD | app/portal/service-requests/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |
| /test | none; test route | app/test/page.tsx | registry/navigation audit required | delete after telemetry/caller audit | P1 if visible in release |

## Önerilen Cleanup

- Release'te sadece canonical `/app/...` yüzeyi görünür kalmalı.
- `/muhasebe`, `/ik/personel`, `/ayarlar` gibi eski wrapper route'lar hidden/redirect/delete-after-test olarak ayrılmalı.
- `/test` ve placeholder sayfalar release registry ve navigation yüzeyinden kesin gizlenmeli.
