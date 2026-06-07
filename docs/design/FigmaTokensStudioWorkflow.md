# Figma Tokens Studio Workflow

Eden ERP exports `figma-tokens.json` in a Tokens Studio compatible structure:

- `eden.light`
- `eden.dark`
- nested color, radius, shadow, typography, density and icon groups

Designers should import the JSON into Tokens Studio, edit token values and export JSON back. The returned production import file should be `eden-theme.json`, because Eden native schema is the validation contract.

## Designer Limits

- Do not change layout, component hierarchy or workflows.
- Do not add custom CSS.
- Do not add external fonts or URLs.
- Keep light and dark token sets complete.
- Preserve token names and schema version.

## Recommended Review

Designers should provide notes for:

- changed color intent
- typography/radius/shadow decisions
- light/dark contrast risks
- screenshots reviewed
- any token they intentionally left unchanged
