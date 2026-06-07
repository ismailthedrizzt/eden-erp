# Theme Package Standard

Eden ERP theme packages are JSON-only design token packages. Designers can work in Figma or Tokens Studio without editing application code.

## Package Layout

```text
eden-erp-theme-package/
|- eden-theme.json
|- figma-tokens.json
|- css-variables.css
|- README.md
`- preview-screenshots/
   |- login.png
   |- dashboard.png
   |- companies-list.png
   |- company-detail.png
   |- employee-list.png
   |- accounting-list.png
   |- document-slot.png
   |- wizard.png
   |- action-center.png
   `- audit-timeline.png
```

The first implementation exposes individual download artifacts through `/api/theme/export`. Zip generation and automated screenshots are future work, but the artifact names and folder structure are zip/package compatible.

## Supported Artifacts

- `eden-theme.json`: canonical Eden token schema.
- `figma-tokens.json`: Tokens Studio compatible token JSON.
- `css-variables.css`: CSS custom properties for inspection and handoff.
- `README.md`: designer brief and screenshot checklist.

## Rules

- Theme packages contain no user data, secrets, tenant data or business records.
- Import accepts only whitelisted design tokens.
- Arbitrary CSS, JavaScript, HTML, external URLs, font files, SVG payloads and executable content are forbidden.
- Imported themes enter preview only and require admin approval before activation.
