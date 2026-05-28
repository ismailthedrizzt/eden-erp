# Accounting Cari E2E Checklist

## Seed Data

- Active company
- Miscellaneous supplier cari account
- Supplier cari account
- Customer cari account
- Partner cari account
- Initial expense, collection and capital payment transactions

## E2E Basliklari

- Cari kart listesi acilir.
- Cari kart create formu calisir.
- Muhtelif Tedarikciler sablonu dogru defaultlarla olusur.
- Cari kart detail paneli genel bilgi, iletisim, bagli kayit, hareket, ozet,
  belge ve denetim sekmelerini gosterir.
- Cari hareket listesi acilir.
- Cari hareket create formu calisir.
- Sirket kurulus gideri senaryosu girilir.
- Odeyen, odenen ve gercek karsi taraf alanlari gorunur.
- Bakiye summary `opening_balance + debit - credit` olarak hesaplanir.
- Document status filtresi `Belge aranacak` hareketleri bulur.
- Reconciliation status filtresi `Eslesmedi` ve `Mutabakat bekliyor`
  hareketleri bulur.
- Yetkisiz kullanici `accounting.view` olmadan ekran/veri erisimi alamaz.
- `accounting.transactionCreate` olmayan kullanici yeni hareket olusturamaz.
- Teknik backend hatasi kullaniciya tablo/stack trace olarak gosterilmez.

## Manual Kontrol

1. Muhasebe menusu gorunur.
2. Cari Kartlar sayfasi acilir.
3. Cari kart olusturulur.
4. Muhtelif Tedarikciler karti olusturulur.
5. Cari Hareketler sayfasi acilir.
6. Kurulus gideri hareketi girilir.
7. Odeyen/odenen alanlari calisir.
8. Belge durumu gorunur.
9. Bakiye summary olusur.
10. Filtreler calisir.
11. Yetkisiz kullanici erisemez.
12. Teknik hata kullaniciya gosterilmez.

## Playwright Notu

Bu repo icinde Playwright aktifse `tests/e2e/accounting-cari.spec.ts` dosyasi
asagidaki testleri kapsamalidir:

- `cari account list`
- `cari account create`
- `cari account detail`
- `cari transaction create`
- `miscellaneous supplier scenario`
- `company opening expense scenario`
- `balance summary`
- `document status filter`
- `reconciliation status filter`
- `permission denied for non-accounting user`
