# Ownership Transactions Page

<!-- source-of-truth-standard: contract overrides markdown -->

`Ortaklık İşlemleri` artık yalnızca ownership/capital engine olarak çalışır.

```text
Ortaklık İşlemleri = hisse, sermaye, oy hakkı, kar payı, pay devri, sermaye taahhüdü ve imtiyaz
Temsilciler = temsil, imza, banka, GİB, SGK, sözleşme, mesul müdür ve kanuni temsilci yetkileri
Cari Hareketler = ödeme, tahsilat ve para akışı
```

Sayfa ilk açıldığında sadece `Şirket`, `İşlem Tipi`, `İşlem Tarihi` ve `Geçerlilik Tarihi` alanları aktiftir. Kullanıcı işlem tipini seçtikten sonra yalnızca ilgili taraf, pay, oy, kar payı, sermaye, imtiyaz ve belge alanları açılır.

Desteklenen işlem tipleri:

```text
Yeni Ortak Girişi
Pay Devri
Kısmi Pay Devri
Ortaklıktan Çıkış
Sermaye Taahhüdü
Sermaye Artırımı
Sermaye Azaltımı
Oy Hakkı Değişikliği
Kar Payı Oranı Değişikliği
İmtiyazlı Pay Tanımı
İmtiyazlı Pay Kaldırma
Düzeltme Kaydı
Ters Kayıt
```

Sekmeler `Genel`, `Taraflar ve Paylar`, `Oy ve İmtiyazlar`, `Belgeler`, `Cari Hareketler`, `Etkiler` ve `Geçmiş` olarak sadeleştirilmiştir. `Yetkiler ve Haklar` adı kullanılmaz; temsil yetkisine ait alanlar bu sayfada tutulmaz.

`Belgeler` sekmesindeki temsilci aksiyonu sadece yönlendirme yapar. Temsil yetkisi `company_representatives` içinde saklanır. `Cari Hareketler` sekmesi de yalnızca bağlı para hareketlerini gösterir ve yeni sermaye ödemesi için Ön Muhasebe Hareketleri formunu açar.
