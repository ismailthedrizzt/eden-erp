# Local Storage Alignment Report

## Changed Files

- `backend/app/domains/documents/storage.py`
- `next.config.js`
- `docs/operations/BackupRestoreRunbook.md`

## Why Changed

Documents are stored in local filesystem storage and opened through controlled media routes. `signedUrl` remains a legacy API field name, but values are controlled media access URLs.

## P0/P1/P2

- P0: protected document media served publicly.
- P1: media cached by PWA/browser incorrectly.
- P1: operator assumes Supabase Storage owns files.
- P2: legacy `signedUrl` name remains for compatibility.

## Field Test Impact

Document previews/downloads should continue through `/api/media/open` and must not rely on `*.supabase.co`.

## Remaining Risks

Document storage backup automation is not yet scheduled.
