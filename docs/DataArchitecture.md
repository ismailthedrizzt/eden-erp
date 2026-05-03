# Veri Mimarisi

## Şirketler ve Kurumsal Yapı

ERP içinde her `sirketler` kaydı bir tüzel kişiliği temsil eder.

```text
companies = legal entities
```

Kurumsal yapı `parent_company_id`, `holding_id` veya ayrı bir legal entity parent modeliyle tutulmaz. Ana ortak, nihai hakim ortak, bağlı şirket ve iştirak ilişkileri `sirket_ortaklar` ownership kayıtlarından hesaplanır.

`sirket_ortaklar` tablosu şirketin corporate ownership kaynağıdır. Önemli alanlar:

- `sirket_id`: ortak olunan şirket
- `owner_kind`: gerçek kişi / tüzel kişi
- `source_type`: kaynak türü
- `source_id`: kaynak kayıt id'si
- `share_ratio`, `voting_ratio`, `profit_ratio`
- `has_control_right`, `control_type`
- `has_board_nomination_right`, `has_veto_right`, `has_privileged_share`
- `beneficial_owner`, `is_beneficial_owner`, `beneficial_ratio`, `is_ultimate_controller`
- `start_date`, `end_date`, `status`
- `history`, `is_deleted`, `deleted_at`, `deleted_by`

ERP içindeki başka bir şirket ortak olduğunda `owner_kind = tuzel_kisi`, `source_type = grup_sirketi`, `source_id = diğer şirket id` kullanılır.

Kurumsal yapı hesabı `calculateCorporateStructure(company_id)` yardımcı fonksiyonuyla yapılır. Detaylar `docs/CorporateStructure.md` ve `docs/OwnershipModel.md` içinde açıklanır.

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
