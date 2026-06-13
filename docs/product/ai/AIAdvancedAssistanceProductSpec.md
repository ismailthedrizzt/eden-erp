# AI Assistance Deepening Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

AI Assistance deepening, Eden ERP icindeki Action Guide ve yardim deneyimini baglamsal AI Copilot seviyesine tasir. Copilot kullanicinin bulundugu sayfayi, secili kaydi, yetkilerini, feature/readiness durumunu, pending action'lari ve belge/denetim ozetlerini dikkate alarak aciklama, kayit ozeti, form onerisi, belge zekasi ve guvenli action yonlendirmesi sunar.

AI resmi veriyi kullanici onayi ve backend precheck olmadan degistirmez. Kritik sirket, sermaye, ortaklik, temsil, sube, muhasebe ve permission islemleri sadece ilgili wizard/action'a yonlendirilir.

## Kapsam

- Global Copilot paneli ve sayfa baglami
- Record summary, action guidance, form assist, document intelligence, insight/admin assist modlari
- Safe action seviyeleri: explain, navigate, prepare aktif; direct execution sinirli ve feature flag'e bagli
- Registry-constrained action resolution
- Permission, scope, readiness ve safety guard kontrolu
- Provider abstraction ve deterministic fallback
- AI history, feedback, audit/observability hazirligi
- Next proxy, typed frontend service ve reusable AI UI componentleri

## Kapsam Disi

- Otonom agent execution
- Keyfi SQL, kod veya API calistirma
- Full OCR/vector search/semantic memory
- AI ile resmi belge dogrulama
- Hukuki veya muhasebesel kesin karar verme
- Kullanici onayi olmadan mutation

## Context Model

Copilot context builder yalnizca scope ve permission'a uygun ozet veri toplar:

- tenant/user/module/current_page
- secili entity tipi, id, label ve status
- permission ve company scope summary
- feature flag ve module readiness summary
- available/disabled actions ve nedenleri
- pending action, data quality, document ve audit ozetleri

PII, telefon/e-posta/IBAN/VKN/TCKN, signed URL, token ve secret degerleri maskelenir.

## Modes

- Explain: sayfa, alan, disabled action ve readiness aciklamalari
- Record Summary: secili kaydin durumu, riskleri, pending isleri
- Action Guidance: dogru wizard/action ve blocking reason
- Form Assist: metinden form alan onerisi, mutation yok
- Document Intelligence: belge turu, ozet ve alan cikarimi onerisi
- Insight: rapor/KPI/data-quality yorumlari
- Admin Assist: kurulum, readiness, outbox/audit saglik ozetleri

## Safe Action Levels

- Level 0: sadece aciklama
- Level 1: navigate
- Level 2: form/wizard draft hazirligi
- Level 3: explicit confirmation + backend precheck gerektiren sinirli non-critical action
- Level 4: kritik operasyon, direct execution kapali

UI sadece backend eligibility sonucunda `enabled=true` olan action butonlarini aktif gosterir.

## Document Intelligence

Belge zekasi belge turu tahmini, kisa ozet, tarih/tutar/no gibi alan onerileri ve required document slot match hazirligi sunar. Cikti her zaman `requires_human_verification=true` kabul edilir; AI sonucu dogrulanmis resmi kaynak sayilmaz.

## API Endpoints

- `POST /api/v1/ai/copilot/query`
- `POST /api/v1/ai/copilot/context`
- `POST /api/v1/ai/copilot/action-preview`
- `POST /api/v1/ai/copilot/form-assist`
- `POST /api/v1/ai/copilot/document-summary`
- `POST /api/v1/ai/copilot/document-extract`
- `GET /api/v1/ai/copilot/suggestions`
- `GET /api/v1/ai/copilot/history`
- `POST /api/v1/ai/copilot/feedback`

## Permissions

- `aiCopilot.use`
- `aiCopilot.formAssist`
- `aiCopilot.documentIntelligence`
- `aiCopilot.adminAssist`
- `aiCopilot.viewHistory`
- `aiCopilot.manageSettings`

## Feature Flags

- `aiCopilot.enabled`
- `aiCopilot.recordSummary`
- `aiCopilot.formAssist`
- `aiCopilot.documentIntelligence`
- `aiCopilot.safeActions`
- `aiCopilot.adminAssist`
- `aiCopilot.feedback`
- `aiCopilot.history`

## Acceptance Criteria

- Copilot panel opens globally and can query with page context.
- Record summary/action guidance return structured safe responses.
- Registry disallows unknown and critical direct actions.
- Form assist and document intelligence produce suggestions only.
- Permission/scope/readiness cannot be bypassed.
- Provider fallback works when external AI is disabled.
- AI history/feedback/audit surfaces are available.
- Next proxy contract and FastAPI OpenAPI remain valid.
