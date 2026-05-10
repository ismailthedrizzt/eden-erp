# Accounting Integration

Cari Hareketler para hareketlerini yönetir. Ortaklık İşlemleri içinde sermaye ödemesi girilmez.

```text
Ortaklık İşlemleri ortaklık ve sermaye haklarını yönetir.
Temsilciler temsil ve imza yetkilerini yönetir.
Cari Hareketler para hareketlerini yönetir.
```

Ortaklık İşlemleri formundaki `Cari Hareketler` sekmesi bağlı ön muhasebe hareketlerini salt izleme ve yönlendirme amacıyla gösterir.

Kolonlar:

```text
Tarih
Hareket Tipi
Ortak
Tutar
Para Birimi
Sermaye İlişki Tipi
Mahsup Tutarı
Durum
Belge
İşlemler
```

`Yeni Sermaye Ödemesi Hareketi Oluştur` aksiyonu kullanıcıyı `Cari Hareketler / Ön Muhasebe Hareketleri` formuna yönlendirir. Oluşan hareket `linked_ownership_transaction_id` ile Ortaklık İşlemi kaydına bağlanır.

Cari hareketler ödeme takibini ve mutabakatı etkiler, fakat hisse oranı, oy hakkı, kar payı oranı, sermaye hakkı veya imtiyazlı pay üretmez.
