# Representatives Integration

Temsil yetkileri Ortaklık İşlemleri içinde saklanmaz.

```text
Temsilciler = imza, temsil, banka, GİB, SGK, sözleşme, mesul müdür ve kanuni temsilci yetkileri
Ortaklık İşlemleri = hisse, sermaye, oy, kar payı ve imtiyaz
```

Ortaklık İşlemleri formunda temsil yetkisine ait şu alanlar kullanılmaz:

```text
signature_authority
bank_authority
gib_authority
sgk_authority
contract_authority
responsible_manager
legal_representative
```

Bir ortaklık işlemi temsilci kaydı için dayanak olacaksa kullanıcı `Bu işleme dayanarak temsilci kaydı oluştur` aksiyonunu kullanır. Bu aksiyon Temsilciler formunu INSERT modunda açar; şirket, ortak ve belge referansı query parametreleriyle aktarılır. Temsil yetkisi yine `company_representatives` tarafında saklanır.

Belge ilişkisi `document_links` üzerinden kurulmalıdır; Ortaklık İşlemleri kaydı yalnızca dayanak belge bilgisini taşır.
