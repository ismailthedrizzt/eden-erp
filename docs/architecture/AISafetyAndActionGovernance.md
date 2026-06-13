# AI Safety and Action Governance

<!-- source-of-truth-standard: contract overrides markdown -->

## Core Rule

AI Copilot, Eden ERP policy, permission, readiness, field-control, integrity ve operation guard kurallarini bypass edemez. AI yaniti sadece oneridir; resmi mutation kullanici onayi ve canonical backend validation olmadan gerceklesmez.

## Governance Layers

1. Context builder scope ve permission kontroluyle veri toplar.
2. Safety guard context'i maskeler ve riskli istekleri bloklar.
3. Action resolver sadece action registry icindeki action key'leri dondurur.
4. Eligibility sonucu backend policy/readiness/integrity kaynaklidir.
5. UI yalnizca `enabled=true` action'lari calistirilabilir gosterir.
6. Critical operations direct execution'a kapatilir.
7. Audit/history/feedback kayitlari PII ve secret icermeden tutulur.

## Safe Action Levels

- Level 0: explain only
- Level 1: navigate
- Level 2: prepare draft
- Level 3: submit with explicit confirmation and backend precheck
- Level 4: critical operation, no direct AI execution

## Redaction

Copilot context ve response icinde su degerler maskelenir:

- e-posta ve telefon
- IBAN
- TCKN/VKN benzeri 10-11 haneli kimlikler
- signed URL/token/secret/API key benzeri degerler
- raw storage path veya provider secret

## Provider Failure

External AI provider kapali veya hataliysa local deterministic provider cevap uretir. Bu fallback action guidance, form assist ve document intelligence icin urun akisini kullanilabilir tutar.

## Audit

Onerilen audit aksiyonlari:

- `ai_query_submitted`
- `ai_action_preview_created`
- `ai_form_suggestion_accepted`
- `ai_document_extraction_accepted`
- `ai_safe_action_submitted`
- `ai_blocked_by_safety`

Raw prompt ve raw document output audit'e yazilmaz; sanitized metadata yeterlidir.
