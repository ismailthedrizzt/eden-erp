# Local Document Storage

The canonical storage provider is local filesystem storage on the remote server.

Files are addressed by controlled storage paths under the configured document storage root. Raw local filesystem paths are not exposed to the browser.

Security rules:

- Validate MIME, extension and size.
- Block executable/script extensions.
- Validate tenant scope in the storage path.
- Prevent path traversal with resolved common-path checks.
- Serve media only through authenticated FastAPI/BFF routes.
- Include the local storage root in backup and restore operations.
