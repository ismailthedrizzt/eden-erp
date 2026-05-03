# Paydaşlar Sayfası

## Amaç

Paydaşlar sayfası, şirketin çalışan olmayan dış ilişki kayıtlarını yönetir. Muhasebe şirketi, mali müşavir, avukat, danışman, ajans, freelancer, broker, taşeron ve resmi danışman gibi kişi veya kurumlar bu modülde tutulur.

## Form Mimarisi

Sayfa çalışan formuyla aynı `EntityForm` düzenini kullanır:

- Sol kolon: Fotoğraf / Logo ve Belgeler
- Sağ Hero alanı: Temel bilgiler
- Alt alan: Genel, İletişim, Finans, Sözleşmeler, Yetkiler, Projeler, Belgeler, Notlar ve Geçmiş sekmeleri

## Paydaş Türü

Desteklenen tipler:

- Gerçek Kişi
- Tüzel Kişi

Gerçek kişide doğum tarihi, meslek ve uzmanlık alanı gibi bilgiler gösterilir. Tüzel kişide kuruluş tarihi, şirket türü, vergi dairesi, MERSİS ve web sitesi alanları gösterilir.

## Kategori Mantığı

Paydaş kategorisi ilişki türünü belirler:

- Muhasebe
- Mali Müşavir
- Avukat
- Danışman
- Ajans
- Freelancer
- Taşeron
- Tedarikçi Temsilcisi
- Broker
- Resmi Temsilci
- İrtibat Kişisi
- Diğer

Kategoriye göre bazı destek alanları görünür hale gelir. Örneğin Avukat için Baro No, Freelancer/Danışman için saatlik ücret ve teslim modeli alanları kullanılır.

## Finans İlişkileri

Finans sekmesi cari hesap, IBAN, banka, ödeme şekli, vade günü, para birimi, fiyatlandırma notu ve vergi ilişkilerini tutar.

## Sözleşme İlişkileri

Sözleşmeler sekmesi sözleşme türü, başlangıç/bitiş tarihi, otomatik yenileme, aylık/yıllık bedel, para birimi ve SLA seviyesini tutar.

## Yetki İlişkileri

Yetkiler sekmesi şirket temsil, GİB, SGK, sözleşme, vekalet ve belge teslim yetkilerini izler.

## Geçmiş Takibi

Takip edilen alanlar:

- Paydaş Kategorisi
- Durum
- Telefon
- Email
- Sorumlu İç Kişi
- Başlangıç Tarihi

Geçmiş sekmesi timeline görünümü sağlar.

## Soft Delete

Paydaş kayıtları fiziksel olarak silinmez. Silme eylemi:

- status = Pasif
- is_deleted = true
- deleted_at
- deleted_by

alanlarını günceller.
