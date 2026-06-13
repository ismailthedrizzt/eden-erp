# Theme Security And Validation

<!-- source-of-truth-standard: contract overrides markdown -->

Theme import is JSON-only and token-schema-only. It does not accept executable or renderable payloads.

## P0 Forbidden Content

- JavaScript
- HTML
- CSS blocks
- external URLs
- `@import`
- `url(...)`
- font files
- base64 binary
- SVG payloads
- style injection
- `expression(...)`
- unknown token groups
- executable uploads
- zip path traversal, when zip support is added

## Decorative Motif Boundary

Decorative motif support is metadata/config only. Accepted motif fields describe style, corner type, illustration type, opacity, line weight and usage flags. They do not permit uploaded CSS, HTML, JavaScript, external URLs, font files or SVG payloads.

## Validation Steps

1. Size limit: 256 KB.
2. JSON parse.
3. Supported `schemaVersion`.
4. Safe `themeKey`.
5. Required root fields.
6. Required light and dark token groups.
7. Unknown key rejection.
8. Safe token value formats.
9. No URL/script/HTML/CSS payload.
10. Basic contrast smoke.

## Contrast Policy

Critical contrast failures do not execute code and may be previewed in Design Lab, but they block activation. Warnings can be reviewed by admin before approval.

## Audit Events For Persistent Phase

- `theme_imported`
- `theme_validation_failed`
- `theme_previewed`
- `theme_activated`
- `theme_archived`
- `user_theme_changed`
- `tenant_default_theme_changed`
