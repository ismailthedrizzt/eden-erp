# Eden Theme JSON Schema

<!-- source-of-truth-standard: contract overrides markdown -->

Canonical file: `eden-theme.json`

Required root fields:

- `schemaVersion`
- `themeKey`
- `displayName`
- `version`
- `tokens.light`
- `tokens.dark`

Supported schema version: `1.0.0`

## Root Shape

```json
{
  "schemaVersion": "1.0.0",
  "themeKey": "executive_premium",
  "displayName": "Kurumsal Premium",
  "description": "Ciddi, guven veren kurumsal ERP temasi.",
  "author": "EDEN Teknoloji",
  "version": "1.0.0",
  "compatibleApp": "eden-erp",
  "tokens": {
    "light": {},
    "dark": {}
  },
  "metadata": {
    "personality": ["ciddi", "guven veren"],
    "bestFor": ["yonetim", "finans"],
    "decorativeMotif": {
      "style": "art_deco_geometry",
      "cornerType": "stepped geometric corner frame",
      "illustrationType": "thin architectural linework",
      "opacity": { "light": 0.24, "dark": 0.18 },
      "lineWeight": 1.25,
      "useOnHero": true,
      "useOnFeaturedCards": true,
      "useOnEmptyStates": true,
      "useOnSectionHeaders": true
    },
    "createdAt": "2026-06-07",
    "source": "eden_export"
  }
}
```

`metadata.decorativeMotif` is descriptive configuration only. It cannot contain CSS, HTML, JavaScript, external URLs, font files or SVG payloads.

## Allowed Token Groups

- `color.background`
- `color.foreground`
- `color.surface`
- `color.surfaceMuted`
- `color.surfaceRaised`
- `color.border`
- `color.borderStrong`
- `color.text.primary`
- `color.text.secondary`
- `color.text.muted`
- `color.accent.primary`
- `color.accent.secondary`
- `color.accent.soft`
- `color.success`
- `color.warning`
- `color.danger`
- `color.info`
- `radius.small`
- `radius.medium`
- `radius.large`
- `radius.card`
- `radius.input`
- `radius.button`
- `shadow.subtle`
- `shadow.card`
- `shadow.floating`
- `shadow.focus`
- `typography.fontFamily`
- `typography.headingWeight`
- `typography.bodyWeight`
- `typography.labelWeight`
- `typography.scale`
- `density.table`
- `density.form`
- `density.dashboard`
- `icon.strokeWidth`
- `icon.containerRadius`
- `icon.containerStyle`
- `icon.moduleBackgroundOpacity`

Unknown keys fail validation by default.
