# Document Management E2E Checklist

## Seed

- Aktif sirket
- Temsilci
- Calisan
- Servis kaydi
- Document requirement
- Yuklenmis belge
- Reddedilmis belge
- Suresi dolmus belge

## E2E Basliklari

- Belge yonetimi sayfasi acilir.
- Belge upload formu dosya kabul eder.
- Mobile camera input image capture attribute ile render edilir.
- Entity relation dogru olusur.
- Required document list missing/uploaded durumlarini gosterir.
- Belge preview URL permission kontrollu alinir.
- Belge download URL permission kontrollu alinir.
- Signed URL audit veya access log detayinda gorunmez.
- New version endpointi yeni version no ile belge olusturur.
- Verify aksiyonu belgeyi verified yapar.
- Reject aksiyonu rejected reason saklar.
- Expiring documents endpointi 30 gun icindeki belgeleri listeler.
- Unauthorized kullanici belgeye erisemez.
- Technical error UI'da ham stack trace olarak gorunmez.

## Playwright Varsa

Dosya:

```text
tests/e2e/document-management.spec.ts
```

Test gruplari:

- `document upload`
- `required document blocking`
- `document preview/download`
- `new version`
- `verify/reject`
- `by entity documents`
- `expiring documents`
- `mobile photo upload input`
- `unauthorized document access denied`
- `signed URL not leaked in audit`

