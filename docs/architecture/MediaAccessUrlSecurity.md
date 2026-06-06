# Media Access URL Security

`mediaAccessUrl` is the preferred field for document preview/download links.

It points to controlled application routes, not public object storage:

```text
Browser -> Next BFF /api/media/open -> FastAPI /api/v1/documents/media/open -> local filesystem
```

Rules:

- The route requires app auth and tenant context.
- The backend validates storage path scope.
- The browser never receives a raw local filesystem path.
- `signedUrl` may appear only as a backward-compatible alias and should not be used by new code.
