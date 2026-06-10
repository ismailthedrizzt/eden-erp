# Hikmet Theme Package

Hikmet is the Eden ERP system theme package for calm, structured and medrese geometry inspired surfaces.

## Files

- `hikmet.eden-theme.json`: Eden ERP runtime theme contract.
- `hikmet.figma-tokens.json`: Figma/Tokens Studio export. It is not a runtime theme file.
- `hikmet.theme.schema.ts`: V2 schema exports.
- `hikmet.theme.mapper.ts`: Eden runtime, Figma and CSS variable mappers.
- `hikmet.theme.validator.ts`: Import and validation helpers.
- `hikmet.assets.ts`: Public SVG asset references.

## Import Rule

Only `hikmet.eden-theme.json` can be imported as a runtime theme. Figma tokens must be hydrated into an Eden Theme JSON package before import.
