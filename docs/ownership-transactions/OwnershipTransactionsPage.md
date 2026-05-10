# Ownership Transactions Page

`Ortaklık İşlemleri`, şirket ortaklık haklarının işlem bazlı yönetildiği sayfadır.

Temel kural:

```text
Ortaklar = şirkete ortak olarak bağlı kişi veya kurum
Ortaklık İşlemleri = pay, oy, kar payı, sermaye ve kontrol haklarını oluşturan olay
```

Sayfa `Şirket Yönetimi / Ortaklık İşlemleri` altında yer alır. Liste, `PageBanner`, dashboard widget alanı, `SmartDataTable`, form hero alanı, detay sekmeleri, view/insert/edit modları ve workflow aksiyonlarıyla Eden ERP sayfa mimarisini izler.

Desteklenen işlemler arasında yeni ortak girişi, pay devri, kısmi pay devri, ortaklıktan çıkış, sermaye artırımı/azaltımı, oy hakkı değişikliği, kar payı değişikliği, imtiyazlı pay, kontrol hakkı, veto hakkı, nihai faydalanıcı değişikliği, düzeltme kaydı ve ters kayıt bulunur.

Bu sayfa ownership hakları için source of truth olarak tasarlanmıştır. Ortaklar sayfasındaki hesaplanan haklar manuel düzenlenmez.
