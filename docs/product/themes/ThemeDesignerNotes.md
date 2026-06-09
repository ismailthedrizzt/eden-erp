# Temalarımız Tasarımcı Notları

Bu belge Eden ERP içindeki Development ortamı **Temalarımız** ekranında yönetilecek sistem temaları için tasarımcı teslim kapsamını tanımlar.

## Kapsam

- Tema kapsamı şimdilik sadece `system` değeridir.
- Layout, iş akışı, form yapısı, liste davranışı ve modül hiyerarşisi değiştirilmez.
- Tasarımcı sadece token, yüzey, pattern, görsel referans ve component state kuralları üzerinde çalışır.
- Eden logosu değiştirilmez.

## Görsel Varlıklar

Görseller JSON içine binary/base64 olarak gömülmez. Her görsel asset reference olarak tanımlanır.

Yönetilen slotlar:

- Page Banner light illustration
- Page Banner dark illustration
- Liste alanı watermark / subtle illustration
- Form hero illustration
- Detail panel side image
- Wizard side/completion illustration
- Login hero image
- Dashboard hero illustration

Her asset için light/dark varyant, sourceType, focal point, fit, opacity, overlay ve visibleOn metadata tutulur.

## Page Banner

Page Banner şu parametrelerle temadan yönetilir:

- background type: `solid`, `gradient`, `pattern`, `illustration`, `illustration + overlay`
- illustration / hero image
- overlay color / opacity
- image opacity
- image positioning / sizing / crop behavior
- corner decoration
- border / frame style

## Liste Yüzeyi

Smart List sadece tablo renklerinden ibaret değildir. Tema şu alanları yönetebilir:

- list container background
- list header surface
- decorative background
- watermark / subtle illustration
- top strip decoration
- panel border style
- row separators
- hover visual effect
- empty-state illustration
- toolbar surface style

## Teslim Formatları

- Eden Theme JSON
- Figma Tokens / Tokens Studio uyumlu JSON
- CSS variables çıktısı
- Asset reference listesi
- Tasarım notları

## Güvenlik

Import edilen içerikte script, HTML, raw CSS injection, `@import`, `javascript:`, `expression()` veya kontrolsüz external executable referansları kabul edilmez. Custom CSS variable anahtarları `--eden-*` prefix’i ile sınırlıdır.
