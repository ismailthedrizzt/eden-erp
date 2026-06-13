# Storage Architecture Audit

Date: 2026-06-06
Branch: `main`
Commit: `09e90b5588a43af147d75b2926d5368a6f4635b9`

## Current Storage Model

| Question | Answer |
| --- | --- |
| Local document storage calisiyor mu? | Yes by code path. `storage.py` writes to local filesystem and normalizes provider to `local`. |
| Storage root neresi? | `DOCUMENT_STORAGE_ROOT`, default `var/document-storage` under repo root when relative. |
| Path traversal engelleniyor mu? | Yes. Path rejects `/`, `..`, URLs and `local_storage_file_path` checks `commonpath`. |
| Media route auth/tenant/scope kontrolu yapiyor mu? | Yes. Next `/api/media/open` proxies to FastAPI `/api/v1/documents/media/open`; FastAPI requires access context and validates tenant id in storage path. |
| Supabase Storage kalintisi var mi? | Yes. Legacy thumbnail/backfill TS utilities still use `supabase.storage`; docs and UI fallback also mention Supabase. |
| `signedUrl` terminolojisi yanlis mi? | Partially. `create_signed_url` is a compatibility name returning a controlled local media access URL. |
| Local storage backup kapsaminda mi? | Not fully confirmed. DB runbook exists; document storage backup runbook needs explicit inclusion. |

## P0 Checks

| P0 condition | Baseline |
| --- | --- |
| Media route auth'suz dosya veriyor | Not confirmed; FastAPI route requires access context. |
| Storage path public | Not confirmed; local path is served through controlled media route. |
| Local storage backup disinda kaliyor | Potential P1/P0 operational risk; explicit backup inclusion not confirmed. |

## Risks

| Priority | Risk | Fix |
| --- | --- | --- |
| P1 | Local document storage backup scope not explicit. | Add local storage directory to backup/restore runbook. |
| P1 | Supabase thumbnail utilities remain. | Replace with local thumbnail generation or delete. |
| P2 | `signedUrl` compatibility name remains. | Rename external docs to `mediaAccessUrl`, keep alias only as API compatibility. |

## Decision

`READY_WITH_LIMITATIONS`
