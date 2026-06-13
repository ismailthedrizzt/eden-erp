# Auth Responsive Smoke Report

Date: 2026-06-09

## Viewports Covered

Planned smoke coverage:

- desktop: 1440px and wider
- tablet: 768-1024px
- mobile: 360px and wider

## Expected Desktop Result

- two-column layout is visible
- left product area has feature/module cards
- right auth panel remains centered and readable
- background grid, node network, holographic platform, data wave, and panel glow are visible without blocking form text

## Expected Tablet Result

- columns compress without shrinking the auth panel below a usable width
- feature/module density reduces
- decorative hologram opacity decreases

## Expected Mobile Result

- single-column layout
- no horizontal scroll at 360px
- login form stays usable
- input and buttons are at least 44px high
- module/trust blocks are hidden to reduce clutter
- background visuals are subdued

## Functional Smoke Checklist

- `/login` opens without app shell
- Eden logo is unchanged
- `Giriş Yap` tab works
- `Kaydol` tab works
- phone/e-mail input accepts text
- `Devam Et` triggers the existing auth flow
- validation messages are visible
- loading and disabled states are visible
- OTP fields remain accessible
- theme and appearance changes inside the app do not change public auth visuals

## Current Status

Implementation includes responsive CSS rules and scoped auth styles. Final browser/device smoke should be performed after deployment on `https://app1.edengrup.com/login`.
