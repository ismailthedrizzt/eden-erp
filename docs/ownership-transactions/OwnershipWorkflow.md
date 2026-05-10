# Ownership Workflow

Ortaklık işlemleri workflow-ready durum alanlarıyla tutulur.

İşlem durumları:

```text
draft
active
cancelled
reversed
passive
```

Onay durumları:

```text
draft
pending_approval
approved
rejected
cancelled
```

Aksiyonlar:

- Onaya Gönder
- Onayla
- Reddet
- İptal Et
- Ters İşlem Oluştur

Yalnızca `approved + active` işlemler hesaplamaya girer. Taslak, reddedilmiş, iptal edilmiş, pasif veya soft delete edilmiş işlemler güncel ortaklık haklarını etkilemez.

Audit ve geçmişte işlem oluşturma, taraf değişikliği, pay/oy/kar payı/sermaye değişiklikleri, belge değişiklikleri, onay durumu değişiklikleri, iptal ve ters kayıt aksiyonları tutulur.
