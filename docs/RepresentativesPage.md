# Temsilciler Sayfası

## Amaç

Temsilciler sayfası, şirket adına temsil, imza, banka, GİB, SGK, sözleşme, satınalma ve ödeme onayı gibi yetkileri olan kişi veya kurum kayıtlarını yönetir.

Her satır bir temsilci veya yetkili kurum kaydıdır.

## Form Mimarisi

Sayfa çalışan formuyla aynı `EntityForm` mimarisini kullanır:

- Sol kolon: Fotoğraf / Logo ve Yetki Belgeleri
- Sağ Hero alanı: Temel bilgiler
- Alt alan: Detay sekmeleri
- Aksiyonlar: Hero sağ altındaki Düzenle, Kaydet ve İptal butonları

## Kişi / Kurum Tipi

Desteklenen tipler:

- Gerçek Kişi
- Tüzel Kişi

Gerçek kişi için kaynak türleri:

- Çalışan
- Ortak
- Yönetim Kurulu Üyesi
- Dış Kişi

Tüzel kişi için kaynak türleri:

- Cari
- Paydaş
- Ortak Şirket

## Yetki Tipleri

Desteklenen yetkiler:

- İmza Yetkilisi
- Banka Yetkilisi
- GİB Yetkilisi
- SGK Yetkilisi
- Sözleşme Yetkilisi
- Satınalma Onay Yetkilisi
- Ödeme Onay Yetkilisi
- Mesul Müdür
- Kanuni Temsilci

Hero alanında `Ana Yetki Tipi`, Yetkiler sekmesinde ise çoklu yetki listesi yönetilir.

## Yetki Limitleri

Finansal yetkilerde limit ve para birimi alanları kullanılır:

- Banka Yetkilisi
- Ödeme Onay Yetkilisi
- Satınalma Onay Yetkilisi

Limitler sekmesi operasyonel ve finansal limitleri ayrı alanlarda tutar.

## Belge İlişkileri

Yetki belgeleri sol belge yükleyici kartında yönetilir:

- İmza Sirküleri
- Vekaletname
- Yönetim Kurulu Kararı
- Ticaret Sicil Gazetesi
- Banka Yetki Formu
- GİB Yetki Belgesi
- SGK Yetki Belgesi
- Diğer Belgeler

Belgeler sekmesinde yüklenen belgelerin özeti gösterilir.

## Geçmiş Takibi

Takip edilen alanlar:

- Yetki Durumu
- Ana Yetki Tipi
- İmza Türü
- Yetki Limiti
- Başlangıç Tarihi
- Bitiş Tarihi
- Kaynak Türü
- Kayıt Seçimi

Geçmiş sekmesi timeline görünümü sağlar.

## Silme Yerine Pasifleştirme

Temsilci kayıtları fiziksel olarak silinmez. Silme eylemi:

- status = Pasif
- is_deleted = true
- deleted_at
- deleted_by

alanlarını günceller.
## Master Identity Refactor

Temsilci oluşturma akışında `Kaynak Türü` ilk soru değildir. Kullanıcı önce `Kişi/Kurum Tipi` seçer, kimlik bilgilerini girer, backend master kayıtlarda kesin veya zayıf eşleşme arar, ardından temsil rol detayları alınır.

Gerçek kişi temsilciler `sirket_temsilciler.person_id`, tüzel kişi temsilciler `sirket_temsilciler.organization_id` üzerinden master kimliğe bağlanır.

Hedef rol alanları:

- `id`
- `company_id`
- `representative_kind: person | organization`
- `person_id`
- `organization_id`
- `authority_types`
- `status`
