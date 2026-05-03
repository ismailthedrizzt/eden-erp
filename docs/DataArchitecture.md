# Veri Mimarisi

## Şirket Temsilcileri

Şirket temsilcileri `sirket_temsilciler` tablosunda tutulur. Tablo eski alanları korur ve ERP temsilci modeli için genişletilmiş alanlar içerir.

Ana alanlar:

- id
- sirket_id
- authority_types
- person_kind
- source_type
- source_id
- display_name
- start_date
- end_date
- status
- document_reference_id
- notes
- bank_authority_level
- transaction_limit
- payment_approval_limit
- purchase_approval_limit
- currency
- signature_type
- signature_degree
- requires_joint_signature
- can_approve_alone
- department_scope
- gib_permissions
- sgk_permissions
- history
- is_deleted
- deleted_at
- deleted_by

Detay formu için ek JSON alanları:

- photo_logo
- authority_documents
- representative_profile

## Kaynak Kayıtlar

Temsilciler doğrudan kişi bilgisi kopyalamak yerine kaynak kayda bağlanır.

Gerçek kişi kaynakları:

- Çalışan
- Ortak
- Yönetim Kurulu Üyesi
- Dış Kişi

Tüzel kişi kaynakları:

- Cari
- Paydaş
- Ortak Şirket

Bu tasarım, temsil yetkisini kaynak kişi veya kurum kaydından bağımsız olarak tarihçelendirmeyi sağlar.

## Non-Destructive Delete

ERP genelinde gerçek silme yapılmaz. Temsilci satırında pasifleştirme şu alanlarla izlenir:

- status = Pasif
- is_deleted = true
- deleted_at
- deleted_by

Kayıt geçmişi `history` JSON alanında tutulur.

## Geçmiş Takibi

Temsilci geçmişinde eski değer, yeni değer, değiştirme tarihi ve değiştiren saklanır. Takip edilen alanlar:

- authority_type
- person_type
- source_type
- source_id
- start_date
- end_date
- status
- limits
- notes

Bu yapı ileride workflow motorunun yetki değişimlerini denetlemesine ve onay geçmişiyle ilişkilendirmesine uygundur.

## Tekrarlı Aktif Yetki Önleme

Aktif temsilcilerde aynı şirket, kaynak türü, kaynak kayıt ve yetki tipi birleşiminin tekrar eklenmesine izin verilmez. Çoklu yetki seçimi yapıldığında her yetki tipi ayrı kontrol edilir.

## İlişkili Dokümanlar

`document_reference_id`, şirket formundaki Hero Document Loader ile yüklenen belgeleri referanslamak için kullanılır. Örnek belge türleri:

- İmza Sirküleri
- Vekaletname
- Yönetim Kurulu Kararı
- Ticaret Sicil Gazetesi

## Paydaşlar

Paydaşlar `stakeholders` tablosunda tutulur. Bu tablo çalışan olmayan dış kişi ve kurum ilişkilerini yönetir.

Ana alanlar:

- company_id
- stakeholder_type
- category
- display_name
- tax_id
- phone
- email
- country
- city
- status
- priority_level
- internal_owner_employee_id
- relationship_start_date
- relationship_end_date
- iban
- bank_name
- currency
- contract_status
- notes
- photo_logo
- stakeholder_documents
- stakeholder_profile
- history
- is_deleted
- deleted_at
- deleted_by

Paydaş kayıtları fiziksel olarak silinmez; pasifleştirme ve history ile izlenir.
