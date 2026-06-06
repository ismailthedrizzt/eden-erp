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
# Document Domain Principles

Date: 2026-06-06

## Canonical Principles

- Kullanici belgeyi ilgili kayit, form veya wizard baglaminda yukler.
- Sistem belgeyi merkezi `documents`, `document_files` ve `document_relations` yapisiyla yonetir.
- Kullanici mevcut belge secmek zorunda birakilmaz.
- Ayni dosya ayni tenant icinde checksum ile taninir.
- Ayni dosya tekrar fiziksel olarak yazilmaz.
- Yeni baglam icin yeni relation olusturulur.
- Ayni document/entity/operation/slot/relation tekrar yuklenirse relation idempotent olarak yeniden kullanilir.
- Tenant disi duplicate reuse yapilmaz.
- Kart/genel belgeleri ile islem/lifecycle belgeleri UI'da ayrilir.
- Local media access FastAPI kontrollu route uzerinden yapilir.
- `mediaAccessUrl` yeni canonical alandir; `signedUrl` sadece legacy compatibility alanidir.

## Ownership

- Document metadata, file reuse, relation ownership, media access, verification, reject and audit FastAPI domain'indedir.
- Next API route sadece proxy/upload adapter olabilir.
- DocumentSlot ve DocumentLoader kullanici deneyimi saglar; DB/storage karari vermez.
