# Ortaklar Sayfası

## Amaç

Ortaklar sayfası yalnızca ortak listesi değildir. Şirketin kurumsal sahiplik yapısını hesaplayan ve denetlenebilir ownership kayıtlarını yöneten ana ekrandır.

Temel mimari kural:

```text
companies = legal entities
```

Bu nedenle ayrı bir `Legal Entity`, `Parent Company`, `Holding` veya `legal_entity_parent_id` modeli kullanılmaz. Ana ortak, grup şirketi, bağlı şirket ve iştirak ilişkileri `sirket_ortaklar` kayıtlarından hesaplanır.

## Form Alanları

Kimlik:

- Ortak Türü
- Kaynak Türü
- Kayıt Seçimi
- Ortak Adı / Ünvanı

Pay değerleri:

- Hisse Oranı (%)
- Oy Hakkı (%)
- Kar Payı Oranı (%)
- Pay Adedi
- Nominal Değer
- Sermaye Tutarı

Kontrol ve yönetim:

- Kontrol Hakkı Var mı?
- Kontrol Türü
- Yönetim Kurulu Aday Gösterme Hakkı Var mı?
- Veto Hakkı Var mı?
- İmtiyazlı Pay Var mı?

Nihai faydalanıcı:

- Nihai Faydalanıcı mı?
- Nihai Faydalanma Oranı (%)
- Nihai Hakim Ortak mı?

Dönem:

- Başlangıç Tarihi
- Bitiş Tarihi
- Durum

## Kurumsal Yapı Paneli

Liste görünümünün üstünde seçilen şirket için hesaplanan özet gösterilir:

- Ana Ortak
- Nihai Hakim Ortak
- Grup Şirketi mi?
- Bağlı Şirket Sayısı
- İştirak Sayısı
- Toplam Aktif Hisse
- Toplam Oy Hakkı

Bu panel `calculateCorporateStructure(company_id)` mantığının görsel karşılığıdır.

## Liste Kolonları

Akıllı liste kolonları:

- Ortak Adı / Ünvanı
- Ortak Türü
- Kaynak Türü
- Hisse %
- Oy %
- Kar Payı %
- Kontrol
- Nihai Faydalanıcı
- Başlangıç
- Bitiş
- Durum
- İşlemler

## Badge Mantığı

Satırda şu rozetler gösterilebilir:

- Ana Ortak
- Kontrol Sahibi
- Grup İçi
- Nihai Faydalanıcı
- İmtiyazlı
- Tarihsel

## Uyarılar

Ekran aşağıdaki durumlarda uyarı üretir:

- Toplam hisse 100% değil
- Toplam oy hakkı 100% değil
- Birden fazla kontrol sahibi var
- Aktif ana ortak bulunamadı
- Döngüsel ortaklık tespit edildi

## Soft Delete

Ortaklık kayıtları fiziksel olarak silinmez. Silme yerine `Pasifleştir` kullanılır ve şu alanlar tutulur:

- `is_deleted`
- `deleted_at`
- `deleted_by`

## History

Takip edilen alanlar:

- `share_ratio`
- `voting_ratio`
- `profit_ratio`
- `control_type`
- `status`
- `start_date`
- `end_date`
- `source_id`

Değişiklikler eski değer, yeni değer, tarih ve kullanıcı bilgisiyle auditable şekilde saklanır.
## Master Identity Refactor

Ortak oluşturma akışında `Kaynak Türü` ilk soru olmaktan çıkar. Yeni akış:

1. Kişi/Kurum Tipi
2. Kimlik Bilgileri
3. Mevcut Kayıt Eşleştirme
4. Rol Detayları

Gerçek kişi ortaklar `sirket_ortaklar.person_id`, tüzel kişi ortaklar `sirket_ortaklar.organization_id` üzerinden master kimliğe bağlanır. Eski `source_type`, `source_id`, `display_name` ve `identity_number` alanları geçiş süresince okunabilir uyumluluk alanlarıdır.

Hedef rol alanları:

- `id`
- `company_id`
- `owner_kind: person | organization`
- `person_id`
- `organization_id`
- `share_ratio`
- `voting_ratio`
- `profit_ratio`
- `status`
