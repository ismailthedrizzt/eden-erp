# Frontend Responsive Standards

<!-- source-of-truth-standard: contract overrides markdown -->

## Breakpoints

- mobile: `< 640px`
- tablet: `640px - 1024px`
- desktop: `> 1024px`

Tailwind esikleri:

- default: mobile
- `sm`: genis mobil / tablet baslangici
- `md`: tablet
- `lg`: desktop shell

## Layout Rules

- Mobile first class yazilir; desktop genislemeleri `sm`, `md`, `lg` ile eklenir.
- Mobilde tablolara yatay scroll dayatilmaz; kart/liste gorunumu tercih edilir.
- Formlar mobilde tek kolon baslar.
- Uzun tab listeleri wrap yerine yatay scroll kullanir.
- Dialoglar mobilde bottom sheet veya full-screen modal davranisi alir.
- Sticky bottom action bar kaydet/iptal/wizard ileri-geri icin tercih edilir.
- Touch hedefleri minimum 44px olur.
- Hover-only davranis kabul edilmez; tap/click alternatifi gerekir.

## Data-Heavy Screens

Dashboard, rapor ve liste ekranlarinda:

- ustte ozet KPI
- sonra filtreler
- sonra kart veya tablo
- moduller collapsible/lazy olabilir

Mobilde grafikler kucuk ve okunabilir degilse KPI + tablo/kart ozetine doner.

## Accessibility

- Ikon-only button `aria-label` alir.
- Modal/sheet `role="dialog"` ve uygun `aria-label` alir.
- Form label alansiz birakilmaz.
- Error mesajlari alan altinda gorunur.
- Renk tek basina durum anlatmaz; metin/badge de kullanilir.
