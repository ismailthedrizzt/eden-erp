# Partners Integration

Ortaklar sayfası bir ortağın şirkete bağlı olduğunu gösterir. Ortaklık hakkı üreten alanların doğrudan düzenlenmesi kapalıdır:

```text
Hisse Oranı
Oy Hakkı
Kar Payı
Sermaye
Kontrol Hakkı
İmtiyaz
Nihai Faydalanıcı
```

Bu değerleri değiştirmek için `Ortaklık İşlemleri` sayfasında yeni işlem oluşturulur ve işlem onaylanır.

Ortak detayında `Yeni Ortaklık İşlemi Oluştur` aksiyonu bulunur. Bu aksiyon işlem formunu `company_id` ve `partner_id` ön dolu şekilde açar.

`Ortaklık İşlemleri` sayfası ham kişi veya kurum kimliği oluşturmaz. İşlem tarafları `sirket_ortaklar` içinden seçilir. İstenen ortak yoksa önce Ortaklar sayfasından oluşturulur.
