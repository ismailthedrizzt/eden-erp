# Document Domain Principles

Date: 2026-06-06

## Principles

- Belge baglamda yuklenir, merkezde yonetilir.
- Document file storage is centralized with checksum-based duplicate reuse.
- Local filesystem document storage is canonical.
- Raw storage paths are not a public API.
- Media access goes through controlled routes.
- `mediaAccessUrl` is the preferred terminology; `signedUrl` is compatibility naming only.
- Document uploads must carry tenant/entity/module/operation context where available.
- Document access must respect tenant and scope.

## Current Audit Status

Local document storage has tenant-scoped path validation and FastAPI media access. Legacy Supabase thumbnail utilities remain as cleanup targets.
