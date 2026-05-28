# Mobile / PWA E2E Checklist

Playwright kuruldugunda `tests/e2e/mobile-pwa.spec.ts` altinda bu basliklar otomasyona alinacak.

## Basliklar

- mobile dashboard loads
- mobile sidebar drawer opens
- mobile bottom nav opens Action Center
- mobile Action Center opens as sheet
- mobile Action Guide opens as sheet and accepts query
- mobile SmartDataTable switches to card view
- mobile table filter drawer opens and closes
- mobile EntityForm edit does not overflow
- mobile field helper opens on tap
- mobile wizard step navigation works
- mobile task complete action is reachable
- mobile service photo input exposes `accept="image/*"`
- offline fallback page loads
- manifest has icons, start_url, scope, display
- API responses are not cached by service worker

## Viewports

- 320x667 iPhone SE
- 390x844 iPhone 14/15
- 412x915 Android mid-size
- 768x1024 tablet portrait
- 1024x768 tablet landscape
