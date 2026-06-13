# Partners Integration

<!-- source-of-truth-standard: contract overrides markdown -->

Ortaklar sayfası bir kişi veya kurumun şirkete ortak olarak bağlı olduğunu gösterir. Güncel hisse, oy hakkı, kar payı, sermaye ve imtiyaz değerleri manuel düzenlenmez; Ortaklık İşlemleri kayıtlarından hesaplanır.

```text
Ortaklık İşlemleri ortaklık ve sermaye haklarını yönetir.
Temsilciler temsil ve imza yetkilerini yönetir.
Cari Hareketler para hareketlerini yönetir.
```

Ortak detayındaki `Ortaklık İşlemi Oluştur` aksiyonu formu `company_id` ve ilgili ortak bilgisiyle açabilir. Yine de işlem tipi seçilene kadar sadece temel alanlar gösterilir.

Ortaklık İşlemleri ham kişi/kurum kimliği oluşturmaz. İşlem tarafları `sirket_ortaklar` içinden seçilir; eksik ortak önce Ortaklar modülünde oluşturulur.

Temsil yetkisi, banka yetkisi, GİB/SGK yetkisi, sözleşme yetkisi, mesul müdür ve kanuni temsilci bilgileri ortaklık kaydı değildir. Bu bilgiler Temsilciler modülüne aittir.
