# Auth High-Tech Login Design

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-09

## Design Goal

The Eden ERP public auth screen should feel independent, premium, secure, and high-tech. It is a public entry experience, not a tenant-themed app screen.

## Visual Direction

The design uses:

- deep night navy background
- controlled blue/cyan light accents
- subtle amber module accents
- technical grid layer
- node/network line layer
- holographic ERP platform illustration
- data-wave texture at the lower left
- soft glow around the auth panel
- dark glass login panel

The result should suggest:

- AI-supported operations
- bank-native infrastructure
- integrated ERP platform
- enterprise security

## Layout

Desktop:

- two-column composition
- left side: Eden logo, Eden ERP headline, product promise, feature cards, module cards, trust strip
- right side: dark glass login/register panel
- panel width remains in the 420-480px range

Mobile:

- single-column composition
- login panel remains first-class and readable
- module/trust density is reduced
- decorative background layers are softened
- 360px viewport should not create horizontal scroll

## Auth Panel

The panel includes:

- unchanged Eden logo asset
- segmented `Giriş Yap / Kaydol` control
- login or signup form
- OTP state
- clear errors and status messages
- primary blue gradient action button
- security note with lock motif

## Color Rules

The auth surface uses auth-scoped variables only:

- `--auth-*`

The auth surface must not inherit app theme values:

- no `--eden-*`
- no theme-driven page banner/card/input styles
- no tenant-selected theme palettes

## Interaction Rules

Preserved interactions:

- tab switching
- phone/e-mail input
- validation messages
- loading/disabled states
- Enter submit
- OTP input, paste, resend timer
- signup company join flow

## Accessibility

Decorative SVG layers are `aria-hidden` or presentation-only. Input labels remain visible, errors use `role="alert"`, status messages use `role="status"`, and focus rings are visible inside the auth scope.
