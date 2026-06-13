# Theme Release UX Rules

<!-- source-of-truth-standard: contract overrides markdown -->

## Release

- Theme selector is visible as a normal preference inside the profile dropdown.
- Profile button is compact and uses accessible label `Profil ve tercihleri ac`.
- Theme dropdown labels are professional: Klasik, Art Deco Premium, Anadolu Modern, Yeşil Atölye, Pop Studio.
- Appearance mode is a separate profile-menu preference: Sistem, Aydinlik, Karanlik.
- No visible `Design Lab`, `concept`, `development`, `experimental`, `internal` or `theme concept` text.
- Design Lab route remains hidden by release visibility guards.
- Theme choice must not change route visibility, permissions or auth.

## Development

- Design Lab route may be visible.
- Internal badges and visual comparison copy may be shown inside Design Lab only.
- Theme selector still writes the same user preference model as release.

## Placement

Theme and appearance controls are grouped under the top-right profile dropdown. Their option panels open to the left of the dropdown on desktop, and fall back below the selected menu item on narrow screens to avoid header overflow.
