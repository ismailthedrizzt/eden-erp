# Manual Field Test Readiness Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

## Karar

READY_WITH_LIMITATIONS

## Gerekçe

- Backend gates artık temiz: pytest, ruff, mypy PASS.
- Security negative smoke P0 üretmedi.
- DB backup proof var.
- Document storage write/read/backup proof var.
- Public URL ve SSL smoke var.
- Release guard, env guard, DB target guard PASS.
- Field test senaryo ve findings register önceki fazda hazır.

## Limitations

- Worker dedicated process/heartbeat yok; outbox backlog pending 4 olarak izlenmeli.
- Boundary warning 162 kalıyor ama critical error yok.
- HSTS yok.
- Backup standart dizini `/opt/eden-erp/backups` yazılamadı; fallback home dizini kullanıldı.
- Authenticated tenant/scope/media negative testleri manuel field testte tekrar edilmeli.

## Test Edilebilir Modüller

Login, şirketler, ortaklar, temsilciler, şubeler, çalışanlar, cari kartlar/hareketler, belgeler, Action Center, Audit ve Release Guard ilk manuel field test turuna alınabilir.

## Test Dışı / Dikkatli Test

Sözleşmeler, CRM, satış sonrası, gelişmiş raporlama, import/export ve development modülleri release kapsamı kararı için kullanılmamalıdır.
