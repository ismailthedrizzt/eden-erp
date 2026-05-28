# Accounting Cari Real Data Scenarios

## Scenario 1 - Muhtelif Tedarikciler Karti

1. Kullanici `Muhasebe > Cari Kartlar` ekranini acar.
2. `Yeni Cari Kart` ile `Muhtelif Tedarikciler` sablonunu secer.
3. Tur/Rol `miscellaneous`, hesap tipi `collective` olarak olusur.
4. Kucuk ve tek seferlik giderler bu cari kart uzerinden girilebilir.
5. Sistem bu karti master kisi/kurum duplicate kontrolunden muaf tutar.

## Scenario 2 - Sirket Kurulus Gideri

1. Kullanici `Muhasebe > Cari Hareketler` ekranini acar.
2. Cari: `Muhtelif Tedarikciler`.
3. Gercek karsi taraf: `Fotografci - bulunacak`.
4. Kategori: `Kurulus gideri`.
5. Tutar: `500`.
6. Odeme yontemi: `Sahsi odeme`.
7. Odeyen: `Ismail`.
8. Belge durumu: `Belge aranacak`.
9. Durum: `Odendi` / API status `confirmed`.
10. Hareket cari bakiyesine yansir; sirket lifecycle veya ortaklik hakki olusturmaz.

## Scenario 3 - Tedarikci Cari Karti

1. Kullanici yeni tedarikci cari karti olusturur.
2. VKN, vergi dairesi, adres ve iletisim bilgilerini girer.
3. Gider hareketi ekler.
4. Hareket `debit` olarak bakiye olusturur.
5. Summary kartinda toplam borc, toplam alacak ve bakiye gorunur.

## Scenario 4 - Musteri Tahsilati

1. Kullanici musteri cari karti olusturur.
2. Gelir/fatura hareketi ekler.
3. Tahsilat hareketi ekler.
4. Borc/alacak dengelenirse bakiye kapanir.
5. Belge ve mutabakat durumu filtreleri ile takip edilir.

## Scenario 5 - Ortak Sermaye Odemesi

1. Sermaye Artirimi sirket/ownership domain'inde yapilmistir.
2. Ortak sermaye odemesi Cari Hareket olarak girilir.
3. `transaction_type`: `capital_payment` veya `capital_collection`.
4. `related_module`: `capital` veya `ownership`.
5. `related_entity_type`: `capital_increase`, `ownership_transaction` veya `partner`.
6. Mutabakat durumu `needs_review` veya `unmatched` kalabilir.
7. Bu hareket pay oranini dogrudan degistirmez.

## Scenario 6 - Belge Aranacak

1. Kullanici belgesiz gider girer.
2. `document_status`: `document_needed`.
3. Liste ve filtrelerde `Belge aranacak` olarak gorunur.
4. Action Center ileride belge uyarisi uretebilir.

## Scenario 7 - Banka Hareketi Eslesme Hazirligi

1. Cari hareket `unmatched` olarak olusur.
2. `matched_bank_transaction_id` bostur.
3. Banka hareketi entegrasyonu geldiginde reconciliation link kurulabilir.
4. Bu fazda banka API cagrisi veya otomatik eslestirme yoktur.
