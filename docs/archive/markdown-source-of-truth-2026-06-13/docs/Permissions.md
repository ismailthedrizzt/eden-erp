# Permissions

The document and media registry uses explicit permission keys. UI should hide unavailable actions, and backend routes must enforce the same checks.

## Documents

- `documents.view`: view document metadata.
- `documents.insert`: create document records and register first file versions.
- `documents.link`: link existing documents to module records.
- `documents.unlink`: passivate document links.
- `documents.view_sensitive`: view sensitive document metadata and files.
- `documents.download`: generate signed document file URLs.
- `documents.version`: add a new document file version.

## Media

- `media.view`: view media assets and generate media signed URLs.
- `media.insert`: create media assets.
- `media.link`: reuse existing media assets across module records.

## Masking

If a user has `documents.view` but lacks `documents.view_sensitive`, sensitive documents are masked in registry search responses. Backend download and signed URL routes still deny access.

## Audit Events

The registry records these actions in `audit_logs`:

- document uploaded
- document linked
- document unlinked
- document viewed
- document downloaded
- document version changed
- media uploaded
- media linked
- media changed
