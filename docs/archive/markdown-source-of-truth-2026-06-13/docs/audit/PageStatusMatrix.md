# Page Status Matrix

Audit date: 2026-05-31

Method: static route/component inspection plus `next build` output. Status means code/build reality, not full browser E2E. `working` means the page builds and has a meaningful UI/API surface; `partial` means buildable but MVP, wrapper, alias, or incomplete readiness; `placeholder` means intentionally thin/legacy/coming-soon; `unknown` means no confident runtime judgement from static audit.

| route | page/component path | module | current status | release status | standard list template | standard form template | wizard for lifecycle/operation | empty state | loading/error state | permission/runtime visibility | notes | P0/P1/P2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | core | partial | hidden | no | no | not applicable | no | no | unknown | root shell/redirect style surface, not production ERP workspace | P2 |
| `/login` | `app/login/page.tsx` | auth | working | live_candidate | no | yes | not applicable | no | yes | unknown | auth entry builds; production smoke still needed | P1 |
| `/offline` | `app/offline/page.tsx` | pwa | working | live_candidate | no | no | not applicable | no | no | unknown | PWA offline page | P2 |
| `/test` | `app/test/page.tsx` | demo | partial | hidden | no | no | not applicable | no | no | unknown | test-only route | P1 |
| `/app` | `app/app/page.tsx` | core/action_center | working | live_candidate | partial | no | not applicable | partial | partial | yes | dashboard/action center shell; widget placeholders exist | P1 |
| `/app/dashboard` | `app/app/dashboard/page.tsx` | reporting | partial | staging_only | partial | no | not applicable | partial | partial | yes | management dashboard; production should wait for KPI scope smoke | P1 |
| `/app/onboarding` | `app/app/onboarding/page.tsx` | onboarding | working | staging_only | partial | yes | yes | partial | yes | partial | setup/onboarding flow; workspace state sensitive | P1 |
| `/app/yardim` | `app/app/yardim/page.tsx` | core | partial | staging_only | partial | no | not applicable | no | partial | unknown | help page builds; not release-critical | P2 |
| `/app/ayarlar/bildirimler` | `app/app/ayarlar/bildirimler/page.tsx` | notifications | working | staging_only | partial | partial | not applicable | partial | yes | partial | notification preferences/center; scope smoke needed | P1 |
| `/app/belgeler` | `app/app/belgeler/page.tsx` | documents | working | staging_only | partial | partial | not applicable | yes | yes | yes | document UI builds; signed URL/download permission smoke required before live | P1 |
| `/app/surecler` | `app/app/surecler/page.tsx` | process | working | staging_only | partial | no | yes | yes | yes | yes | process/action center page imports TS helper; boundary warning | P1 |
| `/app/surecler/[id]` | `app/app/surecler/[id]/page.tsx` | process | working | staging_only | partial | partial | yes | yes | yes | partial | process detail/task actions; route smoke needed | P1 |
| `/app/sirket` | `app/app/sirket/page.tsx` | company | partial | staging_only | partial | no | not applicable | no | partial | partial | module hub; contains future widgets | P2 |
| `/app/sirket/companies` | `app/app/sirket/companies/page.tsx` | company | working | live_candidate | yes | yes | yes | yes | yes | yes | core company card/lifecycle UI; boundary warning due TS helper imports | P1 |
| `/app/sirket/companies/branches` | `app/app/sirket/companies/branches/page.tsx` | branches | working | live_candidate | yes | yes | yes | yes | yes | yes | branch opening/closing flow present; boundary warning | P1 |
| `/app/sirket/companies/partners` | `app/app/sirket/companies/partners/page.tsx` | partners/ownership | working | live_candidate | yes | yes | yes | yes | yes | yes | ownership transaction separation present; boundary warning | P1 |
| `/app/sirket/companies/representatives` | `app/app/sirket/companies/representatives/page.tsx` | representatives | working | live_candidate | yes | yes | yes | yes | yes | yes | representative authority UX present; boundary warning | P1 |
| `/app/sirket/companies/stakeholders` | `app/app/sirket/companies/stakeholders/page.tsx` | CRM/company | working | staging_only | yes | yes | not applicable | yes | yes | partial | stakeholder UI builds; should converge with CRM route | P1 |
| `/app/sirket/tesisler` | `app/app/sirket/tesisler/page.tsx` | facilities | working | live_candidate | yes | yes | not applicable | yes | yes | yes | facility/location UI builds; company/branch scope smoke needed | P1 |
| `/app/sirket/teskilat` | `app/app/sirket/teskilat/page.tsx` | organization | working | live_candidate | yes | yes | not applicable | yes | yes | yes | organization/staff UI builds; direct helpers warning from boundary check | P1 |
| `/app/sirket/araclar` | `app/app/sirket/araclar/page.tsx` | company_assets | working | staging_only | yes | partial | not applicable | yes | yes | partial | vehicles/assets page; not core live candidate yet | P1 |
| `/app/sirket/demirbas` | `app/app/sirket/demirbas/page.tsx` | company_assets | partial | develop_only | partial | no | not applicable | no | partial | unknown | asset shell | P2 |
| `/app/sirket/paydaslar` | `app/app/sirket/paydaslar/page.tsx` | CRM/company | partial | hidden | no | no | not applicable | no | no | unknown | alias-like page; canonical route is company stakeholders or CRM stakeholders | P2 |
| `/app/sirket/surecler` | `app/app/sirket/surecler/page.tsx` | company/process | partial | staging_only | partial | no | yes | partial | partial | unknown | process hub for company area | P2 |
| `/app/muhasebe` | `app/app/muhasebe/page.tsx` | accounting | partial | staging_only | partial | no | not applicable | no | partial | unknown | accounting hub builds | P2 |
| `/app/muhasebe/cari-kartlar` | `app/app/muhasebe/cari-kartlar/page.tsx` | accounting | working | live_candidate | yes | yes | not applicable | yes | yes | yes | cari card UI builds; backend migration route still P1 | P1 |
| `/app/muhasebe/cari-hareketler` | `app/app/muhasebe/cari-hareketler/page.tsx` | accounting | working | live_candidate | yes | partial | not applicable | yes | yes | yes | transaction list builds | P1 |
| `/app/muhasebe/on-muhasebe-hareketleri` | `app/app/muhasebe/on-muhasebe-hareketleri/page.tsx` | accounting | working | live_candidate | yes | yes | not applicable | yes | yes | yes | pre-accounting movement UI builds | P1 |
| `/app/muhasebe/banka-hesaplari-ve-kartlari` | `app/app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx` | accounting | working | live_candidate | yes | yes | not applicable | yes | yes | yes | bank account/card UI builds | P1 |
| `/app/muhasebe/banka-kart-hareketleri` | `app/app/muhasebe/banka-kart-hareketleri/page.tsx` | accounting | working | live_candidate | yes | no | not applicable | yes | yes | yes | bank/card movements UI builds | P1 |
| `/app/muhasebe/hesap-ve-kart-hareketleri` | `app/app/muhasebe/hesap-ve-kart-hareketleri/page.tsx` | accounting | working | live_candidate | yes | no | not applicable | yes | yes | yes | account/card movements UI builds | P1 |
| `/app/muhasebe/banka-hareketleri` | `app/app/muhasebe/banka-hareketleri/page.tsx` | accounting | partial | develop_only | partial | no | not applicable | no | partial | unknown | thin module page | P2 |
| `/app/muhasebe/banka-hesaplari` | `app/app/muhasebe/banka-hesaplari/page.tsx` | accounting | partial | develop_only | partial | no | not applicable | no | partial | unknown | thin module page; canonical combined page exists | P2 |
| `/app/muhasebe/borclar` | `app/app/muhasebe/borclar/page.tsx` | accounting | partial | develop_only | partial | no | not applicable | no | partial | unknown | local table shell | P2 |
| `/app/muhasebe/dashboard` | `app/app/muhasebe/dashboard/page.tsx` | accounting | partial | staging_only | partial | no | not applicable | no | partial | unknown | KPI/dashboard scope smoke required | P1 |
| `/app/muhasebe/e-fatura-e-arsiv` | `app/app/muhasebe/e-fatura-e-arsiv/page.tsx` | accounting | partial | develop_only | partial | no | not applicable | no | partial | unknown | thin module page | P2 |
| `/app/muhasebe/hesaplar` | `app/app/muhasebe/hesaplar/page.tsx` | accounting | partial | develop_only | partial | no | not applicable | no | partial | unknown | account shell | P2 |
| `/app/muhasebe/islemler` | `app/app/muhasebe/islemler/page.tsx` | accounting | partial | develop_only | partial | partial | not applicable | no | partial | unknown | legacy transaction form style | P2 |
| `/app/muhasebe/mutabakat` | `app/app/muhasebe/mutabakat/page.tsx` | accounting | partial | staging_only | partial | no | not applicable | no | partial | unknown | reconciliation page; backend exists, UI needs smoke | P1 |
| `/app/muhasebe/projeler` | `app/app/muhasebe/projeler/page.tsx` | accounting | partial | develop_only | partial | no | not applicable | no | partial | unknown | project accounting shell | P2 |
| `/app/muhasebe/sermaye-mutabakati` | `app/app/muhasebe/sermaye-mutabakati/page.tsx` | accounting | partial | staging_only | partial | no | not applicable | no | partial | unknown | capital reconciliation needs live data smoke | P1 |
| `/app/ik/calisanlar` | `app/app/ik/calisanlar/page.tsx` | HR | working | live_candidate | yes | yes | yes | yes | yes | yes | preferred HR employee page; lifecycle wizard present | P1 |
| `/app/ik/personel` | `app/app/ik/personel/page.tsx` | HR | working | staging_only | yes | yes | yes | yes | yes | yes | legacy-rich HR page; boundary/state warnings | P1 |
| `/app/ik/personel-ekle` | `app/app/ik/personel-ekle/page.tsx` | HR | placeholder | coming_soon | no | no | not applicable | no | no | unknown | legacy placeholder | P1 |
| `/app/ik/personel/[id]` | `app/app/ik/personel/[id]/page.tsx` | HR | placeholder | coming_soon | no | no | not applicable | no | no | unknown | legacy placeholder | P1 |
| `/app/ik/employees` | `app/app/ik/employees/page.tsx` | HR | placeholder | hidden | no | no | not applicable | no | no | unknown | alias/old route | P2 |
| `/app/ik/teskilat` | `app/app/ik/teskilat/page.tsx` | HR | partial | staging_only | yes | partial | not applicable | no | partial | unknown | HR organization view; needs template consistency pass | P1 |
| `/app/ik/calisma-planlari` | `app/app/ik/calisma-planlari/page.tsx` | HR | partial | develop_only | partial | no | not applicable | no | partial | unknown | thin HR page | P2 |
| `/app/ik/devam-devamsizlik` | `app/app/ik/devam-devamsizlik/page.tsx` | HR | partial | staging_only | partial | no | not applicable | no | partial | unknown | attendance backend exists; UI smoke needed | P1 |
| `/app/ik/izin-bakiyeleri` | `app/app/ik/izin-bakiyeleri/page.tsx` | HR | partial | staging_only | partial | no | not applicable | no | partial | unknown | leave balance UI partial | P1 |
| `/app/ik/izinler` | `app/app/ik/izinler/page.tsx` | HR | partial | staging_only | partial | no | not applicable | no | partial | unknown | leave request UI partial | P1 |
| `/app/ik/izin-turleri` | `app/app/ik/izin-turleri/page.tsx` | HR | partial | staging_only | partial | no | not applicable | no | partial | unknown | leave type UI partial | P1 |
| `/app/ik/puantaj` | `app/app/ik/puantaj/page.tsx` | HR | partial | staging_only | partial | no | not applicable | no | partial | unknown | timesheet/payroll prep UI partial | P1 |
| `/app/crm/paydaslar` | `app/app/crm/paydaslar/page.tsx` | CRM | working | staging_only | partial | yes | not applicable | yes | yes | partial | CRM stakeholder MVP page | P1 |
| `/app/crm/leadler` | `app/app/crm/leadler/page.tsx` | CRM | working | staging_only | partial | partial | not applicable | yes | yes | partial | lead/opportunity component wrapper | P1 |
| `/app/crm/firsatlar` | `app/app/crm/firsatlar/page.tsx` | CRM | working | staging_only | partial | partial | not applicable | yes | yes | partial | opportunity component wrapper | P1 |
| `/app/crm/pipeline` | `app/app/crm/pipeline/page.tsx` | CRM | partial | staging_only | partial | no | not applicable | partial | partial | partial | pipeline view needs field validation | P1 |
| `/app/crm/pipeline-ayarlari` | `app/app/crm/pipeline-ayarlari/page.tsx` | CRM | partial | develop_only | partial | partial | not applicable | partial | partial | partial | settings page, admin-only before live | P1 |
| `/app/crm/takipler` | `app/app/crm/takipler/page.tsx` | CRM | partial | staging_only | partial | partial | not applicable | partial | partial | partial | follow-up page | P1 |
| `/app/gorev-ve-proje-yonetimi` | `app/app/gorev-ve-proje-yonetimi/page.tsx` | projects | working | staging_only | partial | no | not applicable | yes | yes | yes | project management home component | P1 |
| `/app/gorev-ve-proje-yonetimi/projeler` | `app/app/gorev-ve-proje-yonetimi/projeler/page.tsx` | projects | working | staging_only | partial | partial | not applicable | yes | yes | partial | project MVP page | P1 |
| `/app/gorev-ve-proje-yonetimi/gorevler` | `app/app/gorev-ve-proje-yonetimi/gorevler/page.tsx` | projects | working | staging_only | partial | partial | not applicable | yes | yes | partial | task MVP page | P1 |
| `/app/gorev-ve-proje-yonetimi/backlog` | `app/app/gorev-ve-proje-yonetimi/backlog/page.tsx` | projects | working | staging_only | yes | no | not applicable | yes | yes | yes | SmartDataTable backlog page | P1 |
| `/app/gorev-ve-proje-yonetimi/kanban-board` | `app/app/gorev-ve-proje-yonetimi/kanban-board/page.tsx` | projects | working | staging_only | no | no | not applicable | yes | yes | yes | kanban component, not canonical list | P1 |
| `/app/gorev-ve-proje-yonetimi/is-akislari` | `app/app/gorev-ve-proje-yonetimi/is-akislari/page.tsx` | projects/process | partial | develop_only | partial | no | yes | partial | partial | partial | workflow page | P1 |
| `/app/gorev-ve-proje-yonetimi/raporlar` | `app/app/gorev-ve-proje-yonetimi/raporlar/page.tsx` | projects/reporting | working | staging_only | partial | no | not applicable | partial | partial | yes | report component | P1 |
| `/app/gorev-ve-proje-yonetimi/sprintler` | `app/app/gorev-ve-proje-yonetimi/sprintler/page.tsx` | projects | partial | develop_only | partial | no | not applicable | partial | partial | partial | sprint page wrapper | P2 |
| `/app/gorev-ve-proje-yonetimi/takvim` | `app/app/gorev-ve-proje-yonetimi/takvim/page.tsx` | projects | working | staging_only | no | no | not applicable | yes | yes | yes | calendar view | P1 |
| `/app/gorev-ve-proje-yonetimi/zaman-takibi` | `app/app/gorev-ve-proje-yonetimi/zaman-takibi/page.tsx` | projects | partial | develop_only | partial | no | not applicable | partial | partial | partial | time tracking wrapper | P2 |
| `/app/urun-ve-hizmetler` | `app/app/urun-ve-hizmetler/page.tsx` | products | partial | staging_only | partial | no | not applicable | yes | yes | partial | product/after-sales hub | P1 |
| `/app/urun-ve-hizmetler/katalog` | `app/app/urun-ve-hizmetler/katalog/page.tsx` | products | working | staging_only | partial | partial | not applicable | yes | yes | partial | catalog MVP page | P1 |
| `/app/urun-ve-hizmetler/urun-kartlari` | `app/app/urun-ve-hizmetler/urun-kartlari/page.tsx` | products | partial | staging_only | partial | partial | not applicable | yes | yes | partial | product card page, not full canonical template | P1 |
| `/app/urun-ve-hizmetler/hizmet-kartlari` | `app/app/urun-ve-hizmetler/hizmet-kartlari/page.tsx` | products | partial | staging_only | partial | partial | not applicable | yes | yes | partial | service cards | P1 |
| `/app/urun-ve-hizmetler/seri-numarali-urunler` | `app/app/urun-ve-hizmetler/seri-numarali-urunler/page.tsx` | products | partial | develop_only | partial | no | not applicable | partial | partial | partial | serial product page | P2 |
| `/app/urun-ve-hizmetler/bakim-paketleri` | `app/app/urun-ve-hizmetler/bakim-paketleri/page.tsx` | products | partial | develop_only | partial | no | not applicable | partial | partial | partial | maintenance packages | P2 |
| `/app/urun-ve-hizmetler/garanti-sablonlari` | `app/app/urun-ve-hizmetler/garanti-sablonlari/page.tsx` | products | partial | develop_only | partial | no | not applicable | partial | partial | partial | warranty templates | P2 |
| `/app/urun-ve-hizmetler/lisans-abonelik-urunleri` | `app/app/urun-ve-hizmetler/lisans-abonelik-urunleri/page.tsx` | products | partial | develop_only | partial | no | not applicable | partial | partial | partial | license/subscription products | P2 |
| `/app/satis-sonrasi` | `app/app/satis-sonrasi/page.tsx` | after_sales | working | staging_only | partial | no | not applicable | yes | yes | partial | after-sales hub | P1 |
| `/app/satis-sonrasi/musterideki-urunler` | `app/app/satis-sonrasi/musterideki-urunler/page.tsx` | after_sales | working | staging_only | partial | partial | not applicable | yes | yes | partial | installed/customer assets MVP | P1 |
| `/app/satis-sonrasi/servis-talepleri` | `app/app/satis-sonrasi/servis-talepleri/page.tsx` | after_sales | working | staging_only | partial | partial | not applicable | yes | yes | partial | service request MVP | P1 |
| `/app/satis-sonrasi/servis-kayitlari` | `app/app/satis-sonrasi/servis-kayitlari/page.tsx` | after_sales | working | staging_only | partial | partial | not applicable | yes | yes | partial | service records MVP | P1 |
| `/app/satis-sonrasi/kurulu-urunler` | `app/app/satis-sonrasi/kurulu-urunler/page.tsx` | after_sales | working | staging_only | partial | partial | not applicable | yes | yes | partial | installed products wrapper | P1 |
| `/app/satis-sonrasi/bakim-planlari` | `app/app/satis-sonrasi/bakim-planlari/page.tsx` | after_sales | partial | staging_only | partial | partial | not applicable | yes | yes | partial | maintenance plans | P1 |
| `/app/satis-sonrasi/bakimi-gelenler` | `app/app/satis-sonrasi/bakimi-gelenler/page.tsx` | after_sales | partial | staging_only | partial | no | not applicable | yes | yes | partial | maintenance due | P1 |
| `/app/satis-sonrasi/saha-gorevleri` | `app/app/satis-sonrasi/saha-gorevleri/page.tsx` | after_sales | partial | staging_only | partial | partial | not applicable | yes | yes | partial | field assignment | P1 |
| `/app/satis-sonrasi/mobil-servis/[assignment_id]` | `app/app/satis-sonrasi/mobil-servis/[assignment_id]/page.tsx` | after_sales | partial | staging_only | partial | partial | not applicable | yes | yes | partial | mobile field-service route | P1 |
| `/app/satis-sonrasi/checklistler` | `app/app/satis-sonrasi/checklistler/page.tsx` | after_sales | partial | develop_only | partial | no | not applicable | partial | partial | partial | checklist templates | P2 |
| `/app/satis-sonrasi/garanti-takip` | `app/app/satis-sonrasi/garanti-takip/page.tsx` | after_sales | partial | develop_only | partial | no | not applicable | partial | partial | partial | warranty tracking | P2 |
| `/app/satis-sonrasi/lisans-takip` | `app/app/satis-sonrasi/lisans-takip/page.tsx` | after_sales | partial | develop_only | partial | no | not applicable | partial | partial | partial | license tracking | P2 |
| `/app/satis-sonrasi/bakim-sozlesme-takip` | `app/app/satis-sonrasi/bakim-sozlesme-takip/page.tsx` | after_sales | partial | develop_only | partial | no | not applicable | partial | partial | partial | contract tracking | P2 |
| `/app/satis-sonrasi/servis-destek-kayitlari` | `app/app/satis-sonrasi/servis-destek-kayitlari/page.tsx` | after_sales | partial | develop_only | partial | no | not applicable | partial | partial | partial | support records alias | P2 |
| `/app/raporlama/ozel-raporlar` | `app/app/raporlama/ozel-raporlar/page.tsx` | reporting | working | staging_only | partial | partial | not applicable | yes | yes | partial | advanced reporting MVP | P1 |
| `/app/raporlama/zamanlanmis-raporlar` | `app/app/raporlama/zamanlanmis-raporlar/page.tsx` | reporting | working | staging_only | partial | partial | not applicable | yes | yes | partial | scheduled reports MVP | P1 |
| `/app/sistem` | `app/app/sistem/page.tsx` | admin | partial | staging_only | partial | no | not applicable | partial | partial | yes | admin console dashboard wrapper | P1 |
| `/app/sistem/genel` | `app/app/sistem/genel/page.tsx` | admin | partial | staging_only | partial | partial | not applicable | partial | yes | yes | admin workspace settings wrapper | P1 |
| `/app/sistem/moduller` | `app/app/sistem/moduller/page.tsx` | admin | working | staging_only | partial | partial | not applicable | yes | yes | yes | module admin; role-gate required | P1 |
| `/app/sistem/ozellikler` | `app/app/sistem/ozellikler/page.tsx` | admin | working | staging_only | partial | partial | not applicable | yes | yes | yes | feature flags; critical admin-only route | P1 |
| `/app/sistem/saglik` | `app/app/sistem/saglik/page.tsx` | admin | working | staging_only | partial | no | not applicable | yes | yes | yes | health dashboard | P1 |
| `/app/sistem/outbox` | `app/app/sistem/outbox/page.tsx` | admin/outbox | working | staging_only | partial | no | not applicable | yes | yes | yes | outbox admin; worker smoke required | P1 |
| `/app/sistem/entegrasyonlar` | `app/app/sistem/entegrasyonlar/page.tsx` | integrations | working | staging_only | partial | partial | not applicable | yes | yes | partial | integration hub page | P1 |
| `/app/sistem/entegrasyon-ayarlari` | `app/app/sistem/entegrasyon-ayarlari/page.tsx` | integrations/settings | working | staging_only | partial | partial | not applicable | yes | yes | partial | integration settings | P1 |
| `/app/sistem/teknik` | `app/app/sistem/teknik/page.tsx` | admin | partial | hidden | partial | no | not applicable | partial | partial | yes | technical/secrets-adjacent page; hide in production unless superadmin | P1 |
| `/app/sistem/module-licenses` | `app/app/sistem/module-licenses/page.tsx` | admin/settings | working | staging_only | partial | no | not applicable | yes | yes | yes | module license UI | P1 |
| `/app/sistem/kurulum` | `app/app/sistem/kurulum/page.tsx` | setup | working | staging_only | partial | partial | yes | partial | yes | yes | setup center; production admin-only | P1 |
| `/app/sistem/kullanicilar` | `app/app/sistem/kullanicilar/page.tsx` | security | working | staging_only | partial | partial | not applicable | yes | yes | yes | security RBAC users wrapper | P1 |
| `/app/sistem/roller` | `app/app/sistem/roller/page.tsx` | security | working | staging_only | partial | partial | not applicable | yes | yes | yes | security RBAC roles wrapper | P1 |
| `/app/sistem/yetkiler` | `app/app/sistem/yetkiler/page.tsx` | security | working | staging_only | partial | no | not applicable | yes | yes | yes | permission matrix wrapper | P1 |
| `/app/sistem/audit` | `app/app/sistem/audit/page.tsx` | audit | working | staging_only | yes | partial | not applicable | partial | yes | yes | audit page imports TS helper; export/access smoke required | P1 |
| `/app/sistem/import` | `app/app/sistem/import/page.tsx` | import_export | working | staging_only | partial | partial | yes | yes | yes | partial | data import wizard-like page | P1 |
| `/app/sistem/export` | `app/app/sistem/export/page.tsx` | import_export | working | staging_only | partial | partial | not applicable | yes | partial | yes | export/bulk page; scope leak smoke required | P1 |
| `/app/sistem/veri-kalitesi` | `app/app/sistem/veri-kalitesi/page.tsx` | data_quality | working | staging_only | partial | partial | not applicable | yes | yes | yes | data quality page | P1 |
| `/app/sistem/e-postalar` | `app/app/sistem/e-postalar/page.tsx` | notifications/email | working | staging_only | partial | partial | not applicable | yes | yes | partial | system email queue/admin | P1 |
| `/app/sistem/otomasyonlar` | `app/app/sistem/otomasyonlar/page.tsx` | automation | working | staging_only | partial | partial | not applicable | yes | yes | partial | automation rules; production needs audit/guard smoke | P1 |
| `/app/sistem/ai-copilot` | `app/app/sistem/ai-copilot/page.tsx` | AI | partial | staging_only | partial | partial | not applicable | partial | partial | partial | AI settings; production safety smoke required | P1 |
| `/app/sistem/system-parameters` | `app/app/sistem/system-parameters/page.tsx` | settings | working | staging_only | partial | yes | not applicable | yes | yes | yes | system parameters; admin-only | P1 |
| `/app/sistem/kullanici-talepleri` | `app/app/sistem/kullanici-talepleri/page.tsx` | security | working | staging_only | partial | partial | not applicable | partial | yes | partial | user request admin; permission smoke required | P1 |
| `/app/sistem/login-sayfasi` | `app/app/sistem/login-sayfasi/page.tsx` | settings | placeholder | coming_soon | no | no | not applicable | no | no | unknown | legacy placeholder | P1 |
| `/portal` | `app/portal/page.tsx` | customer_portal | placeholder | hidden | no | no | not applicable | no | no | unknown | portal landing wrapper/redirect-like; external access staging only | P1 |
| `/portal/dashboard` | `app/portal/dashboard/page.tsx` | customer_portal | working | staging_only | partial | no | not applicable | yes | yes | partial | portal dashboard; external scope smoke required | P1 |
| `/portal/products` | `app/portal/products/page.tsx` | customer_portal | working | staging_only | partial | no | not applicable | yes | yes | partial | portal product list | P1 |
| `/portal/products/[id]` | `app/portal/products/[id]/page.tsx` | customer_portal | working | staging_only | partial | no | not applicable | yes | yes | partial | portal product detail | P1 |
| `/portal/service-requests` | `app/portal/service-requests/page.tsx` | customer_portal | working | staging_only | partial | partial | not applicable | yes | yes | partial | portal service requests | P1 |
| `/portal/service-requests/[id]` | `app/portal/service-requests/[id]/page.tsx` | customer_portal | working | staging_only | partial | partial | not applicable | yes | yes | partial | portal request detail | P1 |
| `/portal/service-records` | `app/portal/service-records/page.tsx` | customer_portal | working | staging_only | partial | no | not applicable | yes | yes | partial | portal service records | P1 |
| `/portal/documents` | `app/portal/documents/page.tsx` | customer_portal | working | staging_only | partial | partial | not applicable | yes | yes | partial | portal document upload/download; signed URL scope smoke required | P1 |
| `/portal/profile` | `app/portal/profile/page.tsx` | customer_portal | working | staging_only | partial | no | not applicable | yes | yes | partial | portal profile | P1 |
| `/app/demo/document-slot-uploader` | `app/app/demo/document-slot-uploader/page.tsx` | demo | working | hidden | partial | partial | not applicable | yes | partial | yes | demo-only component route | P2 |
| `/app/demo/image-slot-uploader` | `app/app/demo/image-slot-uploader/page.tsx` | demo | working | hidden | partial | partial | not applicable | yes | partial | yes | demo-only component route | P2 |
| `/app/demo/user-avatar` | `app/app/demo/user-avatar/page.tsx` | demo | working | hidden | partial | no | not applicable | partial | partial | unknown | demo-only component route | P2 |
| `/ayarlar/entegrasyon-ayarlari` | `app/ayarlar/entegrasyon-ayarlari/page.tsx` | legacy_alias | partial | hidden | no | no | not applicable | no | no | unknown | legacy alias; canonical `/app/sistem/entegrasyon-ayarlari` | P2 |
| `/ik/personel` | `app/ik/personel/page.tsx` | legacy_alias | placeholder | hidden | no | no | not applicable | no | no | unknown | legacy alias; canonical HR routes under `/app/ik` | P2 |
| `/muhasebe` | `app/muhasebe/page.tsx` | legacy_alias | partial | hidden | no | no | not applicable | no | no | unknown | legacy redirect alias | P2 |
| `/muhasebe/cari-kartlar` | `app/muhasebe/cari-kartlar/page.tsx` | legacy_alias | partial | hidden | no | no | not applicable | no | no | unknown | legacy redirect alias | P2 |
| `/muhasebe/cari-hareketler` | `app/muhasebe/cari-hareketler/page.tsx` | legacy_alias | partial | hidden | no | no | not applicable | no | no | unknown | legacy redirect alias | P2 |
| `/muhasebe/on-muhasebe-hareketleri` | `app/muhasebe/on-muhasebe-hareketleri/page.tsx` | legacy_alias | partial | hidden | no | no | not applicable | no | no | unknown | legacy redirect alias | P2 |
| `/muhasebe/banka-hesaplari-ve-kartlari` | `app/muhasebe/banka-hesaplari-ve-kartlari/page.tsx` | legacy_alias | partial | hidden | no | no | not applicable | no | no | unknown | legacy redirect alias | P2 |
| `/muhasebe/banka-kart-hareketleri` | `app/muhasebe/banka-kart-hareketleri/page.tsx` | legacy_alias | partial | hidden | no | no | not applicable | no | no | unknown | legacy redirect alias | P2 |
| `/muhasebe/hesap-ve-kart-hareketleri` | `app/muhasebe/hesap-ve-kart-hareketleri/page.tsx` | legacy_alias | partial | hidden | no | no | not applicable | no | no | unknown | legacy redirect alias | P2 |

## Summary Counts

| bucket | count | interpretation |
| --- | ---: | --- |
| routes scanned | 138 | all `app/**/page.tsx` routes found during audit |
| buildable routes | 138 | `npm run build` completed and listed app routes |
| live candidates | 16 | should still pass staging auth/tenant/scope smoke before production |
| staging-only candidates | 79 | usable for field test/admin/demo but not production-wide |
| develop/hidden/coming-soon | 43 | do not expose to normal production users |

## Findings

- No page-level compile blocker was found.
- Production visibility must be narrower than build visibility.
- Core company, accounting and HR employee pages are closest to live-ready.
- Portal, integration, AI, automation and admin pages need dedicated role/scope/security smoke before production exposure.
- Legacy aliases and demo routes should be hidden outside development.

## Risks

- P1: buildable partial pages can be mistaken for production-ready pages.
- P1: admin/security/export/audit/document pages need strict role and scope smoke.
- P1: pages importing TS backend-core helpers should not be promoted without boundary cleanup or explicit acceptance.
- P2: legacy aliases increase support and navigation confusion.

## Recommended Fixes

- Implement a route release registry consumed by navigation and direct route guards.
- Mark live candidates as visible only after staging smoke for auth, tenant, company scope and safe error messages.
- Hide demo, test and legacy aliases from production navigation.
- Add E2E smoke for every live candidate route in this matrix.

## P0/P1/P2 Priority

- P0: none confirmed.
- P1: live/staging/develop route gating, admin/portal/document/export smoke, boundary warning cleanup.
- P2: redirect/alias cleanup and page-template polish.

## Suggested Next Prompt

`Page Release Registry + Live/Preview/Hidden Visibility uygula; PageStatusMatrix'teki live_candidate/staging_only/hidden kararlarini runtime navigation ve direct route guard seviyesine bagla.`
