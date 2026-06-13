# Temsilciler Sekmesi

## Amaç

Temsilciler sekmesi, bir şirket adına temsil, onay, imza veya işlem yetkisi olan kişi ve kurumları yönetmek için kullanılır. Kayıtlar silinmez; pasifleştirme ve geçmiş takibi ile saklanır.

## Seçim Akışı

Kullanıcı temsilciyi soldan sağa ilerleyen bir akışla ekler:

1. Yetki / Temsil Tipi
2. Kişi / Kurum Tipi
3. Kaynak Türü
4. Kayıt Seçimi
5. Yetki Detayları
6. Temsilciyi Kaydet

Her adım, önceki adım tamamlandıktan sonra aktif olur.

## Yetki Tipleri

Bir temsilci birden fazla yetki tipine sahip olabilir. Seçimler ikonlu badge olarak gösterilir:

- İmza Yetkilisi
- Banka Yetkilisi
- GİB Yetkilisi
- SGK Yetkilisi
- Sözleşme Yetkilisi
- Satınalma Onay Yetkilisi
- Ödeme Onay Yetkilisi
- Mesul Müdür
- Kanuni Temsilci

## Kişi / Kurum ve Kaynak Mantığı

Gerçek Kişi kaynakları:

- Çalışan
- Ortak
- Yönetim Kurulu Üyesi
- Dış Kişi

Tüzel Kişi kaynakları:

- Cari
- Paydaş
- Ortak Şirket

`İstihdam Tipi` etiketi kullanılmaz. Bu bağlamda doğru etiket `Kaynak Türü`dür.

## Yetki Detayları

Zorunlu alanlar:

- Yetki / Temsil Tipi
- Kişi / Kurum Tipi
- Kaynak Türü
- Kayıt Seçimi
- Başlangıç Tarihi
- Yetki Durumu

Opsiyonel alanlar:

- Bitiş Tarihi
- Yetki Açıklaması / Not
- Belge Referansı

Belge referansı, şirket formunun Hero Document Loader alanındaki belgeleri işaret edebilir.

## Koşullu Alanlar

Banka Yetkilisi:

- Banka Yetki Seviyesi
- İşlem Limiti
- Para Birimi
- Müşterek İmza Gerekli mi?

Ödeme Onay Yetkilisi:

- Ödeme Onay Limiti
- Para Birimi
- Tek Başına Onaylayabilir mi?

Satınalma Onay Yetkilisi:

- Satınalma Onay Limiti
- Para Birimi
- Departman / Birim Kapsamı

İmza Yetkilisi:

- İmza Türü
- Münferit / Müşterek
- İmza Derecesi

GİB Yetkilisi:

- GİB İşlem Yetkileri
- Beyanname Gönderme Yetkisi
- E-Fatura İşlem Yetkisi

SGK Yetkilisi:

- SGK İşlem Yetkileri
- İşe Giriş Bildirgesi Yetkisi
- İşten Çıkış Bildirgesi Yetkisi

## Tekrarlı Kayıt Kontrolü

Aktif temsilcilerde aynı `company_id + source_type + source_id + authority_type` birleşimi tekrar eklenemez. Çoklu yetki seçildiğinde çakışan yetki tipi özel olarak kullanıcıya gösterilir.

## Pasifleştirme ve Geçmiş

Temsilci satırları fiziksel olarak silinmez. `Pasifleştir` işlemi satırı pasif hale getirir ve tarihçe kaydı oluşturur.

Takip edilen alanlar:

- authority_type
- person_type
- source_type
- source_id
- start_date
- end_date
- status
- limits
- notes

Akıllı listede `Geçmiş` ikonu ile eski değer, yeni değer, değiştirme tarihi ve değiştiren bilgisi görülebilir.
