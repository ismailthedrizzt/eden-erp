# Backup And Restore Proof Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

| Kanıt | Sonuç |
| --- | --- |
| Backup directory | `/opt/eden-erp/backups` yazılamadı; güvenli fallback `/home/edengrup-app1/eden-erp-backups` kullanıldı. |
| pg_dump | PASS, exit 0. |
| DB backup file | `/home/edengrup-app1/eden-erp-backups/eden_20260606_151050.sql` |
| DB backup size | 2,285,266 bytes |
| DB backup permissions | 600 |
| Restore | Release DB'ye restore yapılmadı; restore prosedürü dry-run/dokümante kalır. |

## Risk

- P1: `/opt/eden-erp/backups` dizini uygulama kullanıcısı için yazılabilir değil. Field test için fallback güvenli home backup yeterli; release promotion öncesi ops dizini standardize edilmeli.
- P0 bulunmadı: backup alındı, dosya public web root altında değil, boyut > 0, permission 600.
