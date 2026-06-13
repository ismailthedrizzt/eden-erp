# HR Employee E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Seed Data

- Aktif sirket
- Aktif sube
- Organizasyon birimi
- Pozisyon
- Draft calisan
- Aktif calisan
- Temsilciyle bagli calisan opsiyonel
- Zorunlu belge eksigi olan calisan

## E2E Basliklari

- Calisan karti taslagi olusturma
- Calisan detay hero ve sekmeleri
- Ise giris wizard'i
- SGK girisi manuel tamamlandi
- Pozisyon/organizasyon degisikligi
- Isten cikis wizard'i
- Calisan belge ekleme
- Organizasyon/pozisyon baglantisi
- Sube filtresi
- Summary widget'lari
- HR yetkisi olmayan kullanici icin permission denied

## Manuel Kontrol

1. IK menusu gorunur.
2. Calisanlar sayfasi acilir.
3. Calisan karti taslagi olusturulur.
4. Ise Giris modal/wizard acilir.
5. Sirket, birim ve pozisyon secilir.
6. SGK bilgileri girilir.
7. Calisan active olur.
8. SGK Girisi Yapildi action calisir.
9. Pozisyon degisikligi calisir.
10. Isten cikis calisir.
11. Belge eksikleri gorunur.
12. Summary widget'lari calisir.
13. Yetkisiz kullanici teknik hata yerine yetki mesaji gorur.
14. `FASTAPI_BASE_URL` yoksa `/api/hr/**` kontrollu backend yapilandirma hatasi dondurur.

## Playwright Skeleton

Eger Playwright kuruluysa `tests/e2e/hr-employees.spec.ts` asagidaki akislari
kapsamalidir:

- `employee draft create`
- `employee detail`
- `start employment`
- `SGK entry completed`
- `assignment change`
- `terminate employment`
- `employee document upload`
- `organization/position link`
- `branch filter`
- `widget summary`
- `permission denied for non-HR user`
