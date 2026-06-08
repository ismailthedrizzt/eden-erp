# Theme Security Validation

## Blocked Content

Theme import and activation must reject:

- JavaScript
- HTML/script tags
- external URLs
- `@import`
- `url(...)`
- font files
- base64/data payloads
- SVG script or `foreignObject`
- inline event handlers
- arbitrary CSS blocks
- `expression(...)`
- iframes

## Validation

Validation checks:

- schema version
- safe theme key
- required light/dark tokens
- unknown token keys
- safe color/radius/shadow/font values
- forbidden strings
- contrast smoke checks

Critical validation or contrast failures block `Kullanima Ac`. Warnings can be accepted by a development/admin confirmation.
