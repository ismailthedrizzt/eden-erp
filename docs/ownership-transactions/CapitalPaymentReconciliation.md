# Capital Payment Reconciliation

<!-- source-of-truth-standard: contract overrides markdown -->

Sermaye içeren Ortaklık İşlemleri hak veya taahhüt üretir; ödeme kaydı oluşturmaz.

```text
Ortaklık İşlemleri = hak / taahhüt
Cari Hareketler = ödeme / para akışı
```

`CapitalPaymentReconciliationService` sermaye taahhüdünü okur, bağlı cari hareketleri toplar ve şu değerleri hesaplar:

```text
Taahhüt Edilen Sermaye
Ödenen Sermaye
Kalan Sermaye Borcu
Fazla Ödeme
Ödeme Durumu
```

Ödeme durumu seçenekleri:

```text
Taahhüt Yok
Ödeme Bekleniyor
Kısmi Ödendi
Tam Ödendi
Fazla Ödeme Var
Sermaye Avansı Var
Uyuşmazlık / İnceleme Gerekli
```

Desteklenen cari hareket tipleri `Sermaye Ödemesi`, `Sermaye Avansı`, `Ortak Borç Verdi`, `Ortağa Geri Ödeme` ve `Sermaye Borcu Mahsubu` olarak tanımlanır. Bu hareketler tek başına ortaklık hakkı doğurmaz.

Fazla ödeme varsa ve hareket `capital_relation_type` ile sınıflandırılmamışsa kayıt inceleme gerektirir.
