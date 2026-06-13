# Mobile Accessibility Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Touch

- Button/link hedefi en az 44px.
- Bottom nav butonlari metin + ikon icerir.
- Hover-only bilgi yoktur; tap/click alternatifi vardir.

## Keyboard

- Kartlar Enter/Space ile acilabilir.
- Dialog/sheet ESC ile kapanir.
- Focus gorunur kalir.

## Screen Reader

- Ikon-only button `aria-label` alir.
- Action Center ve modal sheet `role="dialog"` kullanir.
- Offline/network status `role="status"` kullanir.
- Form hata metni alan altinda gorunur.

## Visual

- Renk tek basina durum anlatmaz.
- Badge metni durum bilgisini destekler.
- Reduced motion gerektiren animasyonlar zorunlu is akisini engellemez.
