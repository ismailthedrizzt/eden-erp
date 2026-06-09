# Page / Flow Delivery Checklist

Bu checklist her yeni Eden ERP page, form, wizard, lifecycle flow veya operation
request akisi icin doldurulur.

```text
Page / Flow Delivery Checklist

[ ] Page contract olusturuldu
[ ] Route tanimlandi
[ ] Smart List / Form / Wizard standardina uyuldu
[ ] Frontend Zod schema yazildi
[ ] Backend Pydantic request model yazildi
[ ] OpenAPI contract guncellendi
[ ] Generated TS client guncellendi
[ ] Next BFF payload contract'i koruyor
[ ] Date/datetime alanlari normalize ediliyor
[ ] UUID alanlari validate ediliyor
[ ] Enum alanlari canonical value kullaniyor
[ ] Service layer raw dict kullanmiyor
[ ] Repository DB'ye typed/normalized data gonderiyor
[ ] Operation request payload typed schema ile dogrulaniyor
[ ] Kullanici hata mesaji var
[ ] Log correlation id var
[ ] Backend valid payload testi var
[ ] Backend invalid payload testleri var
[ ] Frontend validation testi var
[ ] E2E happy path testi var
[ ] Build/typecheck/lint geciyor
```

## Required Notes

- Missing maddeler final cevapta ve ilgili audit dokumaninda P0/P1/P2 olarak
  yazilir.
- `P0`: crash, veri kaybi, auth bypass, unsafe DB write, XSS veya operation
  corruption riski.
- `P1`: cihaz/tenant degisiminde kayip, typed client eksigi, frontend/backend
  drift, e2e eksigi.
- `P2`: dokuman, preview, UX veya kapsam iyilestirmesi.
