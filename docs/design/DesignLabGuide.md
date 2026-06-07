# Design Lab Guide

Design Lab, Eden ERP icin development-only gorsel kimlik karsilastirma alanidir.

## Nasil acilir

Development ortaminda `/app/design-lab` route'u acilir. Release ortaminda registry guard bu route'u kapatir ve navigation/search/command palette yuzeylerinden gizler.

## Sayfada neler var

- Classic Current baseline
- Executive Premium
- Anatolian Modern
- Technical Command
- Concept token preview
- Dashboard preview
- List/table preview
- Form preview
- Wizard preview
- Document slot preview
- Action Center preview
- Audit timeline preview
- Icon language preview
- Empty/error state preview
- Evaluation checklist

## Kisitlar

Design Lab gercek DB verisi gerektirmez, business mutation yapmaz, production componentleri global olarak degistirmez ve tailwind/global CSS theme'ini yeniden yazmaz.
