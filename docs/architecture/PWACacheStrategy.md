# PWA Cache Strategy

## Ilke

Eden ERP hassas is ve finans verisi tasir. Service worker cache stratejisi guvenli varsayimla baslar: API, auth/session ve mutation cevaplari cache'lenmez.

## Cache Kategorileri

| Kategori | Strateji | Not |
| --- | --- | --- |
| Static image/font assets | CacheFirst veya StaleWhileRevalidate | Logo, icon, font gibi hassas olmayan varliklar |
| App shell bundle | Next/PWA precache | Build tarafindan uretilen statik varliklar |
| API GET | NetworkOnly | Dashboard/list data bu fazda offline cache almaz |
| API POST/PATCH/DELETE | NetworkOnly | Offline write queue yok |
| Auth/session | NetworkOnly | Oturum ve tenant bilgisi cache'lenmez |
| Audit/security data | NetworkOnly | Hassas veri cache disi |
| Navigation | NetworkOnly + offline fallback | Baglanti yoksa `/offline` bilgi sayfasi |

## Offline UX

Offline durumda:

- kullaniciya "Internet baglantisi yok" mesaji gosterilir
- mutation disabled veya server hatasi is diline cevrilir
- otomatik POST retry yapilmaz
- fotograf secimi yapilabilir ama upload icin baglanti gerekir

## Gelecek Faz

- read-only projection cache
- encrypted local draft cache
- offline upload queue
- background sync
- push notification
