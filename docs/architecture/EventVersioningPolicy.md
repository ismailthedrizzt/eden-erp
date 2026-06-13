# Event Versioning Policy

<!-- source-of-truth-standard: contract overrides markdown -->

## Amaç

Outbox, webhook ve downstream subscriber kontratlarini geriye uyumlu yonetmek.

## Version Semantics

- `event_type` business olay adidir; payload sekli degisse bile ayni business anlam korunuyorsa tip degismeyebilir.
- `event_version` payload kontrati icindir.
- Backward-compatible alan ekleme minor uyumlu sayilir ve mevcut version korunabilir.
- Alan silme, anlam degistirme, type degistirme veya zorunlu alan ekleme breaking change'dir ve version artar.
- Breaking change webhook subscriber'lari etkileyecekse eski version bir sure paralel yayinlanir.

## Contract Rules

- Event docs `docs/architecture/EventContracts.md` altinda guncellenir.
- Handlerlar destekledikleri version'lari acikca belirtir.
- Webhook envelope daima `event_version` tasir.
- Consumer unknown version gordugunde fail-closed veya dead-letter stratejisi kullanir.

## Release Checklist

1. Payload diff cikar.
2. Breaking/non-breaking karari yaz.
3. Handler tests version bazinda calisir.
4. Webhook subscriber migration notu hazirlanir.
5. Eski version sunset tarihi varsa release notuna eklenir.
