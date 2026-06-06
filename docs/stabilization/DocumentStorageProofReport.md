# Document Storage Proof Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

| Kanıt | Sonuç |
| --- | --- |
| DOCUMENT_STORAGE_ROOT | `/home/edengrup-app1/htdocs/app1.edengrup.com/var/document-storage` |
| Dizin var mı? | Evet |
| Write smoke | PASS |
| Read smoke | PASS |
| Probe cleanup | PASS |
| Document storage backup | PASS, exit 0 |
| Backup file | `/home/edengrup-app1/eden-erp-backups/documents_20260606_151050.tar.gz` |
| Backup size | 5,452,805 bytes |
| Backup permissions | 600 |

## Risk

- P1-low: storage root repo altındaki `var/document-storage` altında. Controlled media route kullanıldığı için public path olarak servis edilmediği smoke ile doğrulandı; yine de release ops dokümanında bu dizinin public static serving dışında kaldığı tekrar doğrulanmalı.
- P0 bulunmadı: yazılabilir, okunabilir, backup kapsamına dahil.
