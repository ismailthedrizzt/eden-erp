# Accounting Reconciliation Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Banka hareketi import

1. Admin veya muhasebe kullanicisi banka hesabi tanimlar.
2. CSV/XLSX banka ekstresi `bank_transactions_template` ile yuklenir.
3. Duplicate kontrolu referans no ve tarih/tutar/aciklama sinyaliyle calisir.
4. Dry-run sonucu gecerli, duplicate ve hatali satirlari gosterir.
5. Onay sonrasi banka hareketleri olusur.

Beklenen sonuc: banka hareketleri cari hareket olusturmadan `unmatched` durumda listelenir.

## Scenario 2 - Belge aranacak gider

1. Cari hareket `document_needed` durumundadir.
2. Banka ekstresi import edilir.
3. Tutar/tarih/karsi taraf sinyalleriyle matching suggestion olusur.
4. Kullanici eslestirmeyi onaylar.

Beklenen sonuc: cari hareket ve banka hareketi `matched` veya `partially_matched` olur.

## Scenario 3 - e-Arsiv belge eslestirme

1. e-Arsiv metadata/PDF kaydi import edilir.
2. Fatura no ve tutar cari hareketle eslesir.
3. Kullanici match aksiyonunu onaylar.

Beklenen sonuc: e-belge `matched`, cari hareket `matched` durumuna gecer.

## Scenario 4 - Kredi karti harcamasi

1. Sirket kredi karti ekstresi aktarilir.
2. Belge yoksa hareket `document_needed` olarak izlenir.
3. Action Center muhasebe uyarisi gosterir.
4. Belge yuklenince mutabakat yapilir.

## Scenario 5 - Sermaye odeme mutabakati

1. Sermaye artirimi tamamlanmis ve beklenen ortak odemesi olusmustur.
2. Ortak banka transferi gelir.
3. Banka hareketi sermaye mutabakati satiriyla iliskilenir.
4. `paid_amount` artar, `outstanding_amount` azalir.

Beklenen sonuc: odeme tamamlanirsa sermaye mutabakati `matched`, kismi odemede `partially_matched` olur.

## Scenario 6 - Fatura reddi

1. e-Fatura kaydi detaydan reddedilir.
2. e-belge `rejected`, mutabakat `needs_review` olur.
3. Action Center muhasebe uyarisi olusur.

## Scenario 7 - Partial match

1. e-belge tutari 10.000 TRY.
2. Banka tahsilati 6.000 TRY.
3. Kullanici partial match yapar.
4. Kalan 4.000 TRY takip edilir.

