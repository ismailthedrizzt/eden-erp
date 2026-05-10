# Storage Security

Documents and media are stored in private Supabase storage buckets.

Buckets:

- `eden-documents`
- `eden-media`

Frontend code must not expose permanent public URLs or raw storage paths as downloadable links.

## Signed URLs

Backend routes generate short-lived signed URLs after permission checks:

- `POST /api/documents/:id/signed-url`
- `POST /api/media-assets/:id/signed-url`

The document signed URL route checks:

- `documents.download`
- `documents.view_sensitive` for sensitive documents
- current file version unless a specific `file_id` is requested

Signed URLs expire quickly and are generated only after the backend verifies access.

## Sensitive Documents

Sensitive documents include:

- İmza Sirküleri
- Kimlik
- Pasaport
- Vekaletname
- bank authority documents represented by sensitive/confidential metadata

These documents require elevated permission before viewing or downloading.
