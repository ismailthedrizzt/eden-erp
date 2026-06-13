# Ownership Model

## Kapsam

Ownership modeli şirket ortaklığını tarihsel, ekonomik ve yönetsel haklarıyla birlikte tutar. Kurumsal yapı bu kayıtlar üzerinden hesaplanır.

Temel kural:

```text
companies = legal entities
```

Ayrı parent company, holding veya legal entity parent modeli yoktur.

## Ana Tablo

Ana tablo `sirket_ortaklar` tablosudur. Bu tablo eski alanları korur ve ERP-grade ownership alanlarını içerir.

Alan grupları:

- Kimlik: `owner_kind`, `source_type`, `source_id`, `display_name`, `identity_number`
- Pay: `share_ratio`, `voting_ratio`, `profit_ratio`, `share_units`, `nominal_value`, `capital_amount`
- Kontrol: `has_control_right`, `control_type`, `has_board_nomination_right`, `has_veto_right`, `has_privileged_share`
- Nihai faydalanıcı: `beneficial_owner`, `is_beneficial_owner`, `beneficial_ratio`, `is_ultimate_controller`
- Dönem: `start_date`, `end_date`, `status`
- Belge ve not: `document_reference_id`, `notes`
- Denetim: `history`, `created_by`, `updated_by`, `is_deleted`, `deleted_at`, `deleted_by`

## Kaynak Türü

Gerçek kişi kaynakları:

- Çalışan
- Mevcut Temsilci
- Harici Kişi
- Yeni Kişi

Tüzel kişi kaynakları:

- Cari
- Paydaş
- Grup Şirketi
- Harici Şirket
- Yeni Şirket

`Ortak Türü = Tüzel Kişi` ve `Kaynak Türü = Grup Şirketi` olduğunda `source_id` başka bir şirket kaydına işaret eder.

## Ana Ortak Hesabı

Aktif ortaklar içinde en yüksek `voting_ratio` kullanılır. `voting_ratio` boşsa `share_ratio` dikkate alınır. %50 üzeri oy veya hisse sahibi ana ortak kabul edilir. Aksi halde yapı `Dağınık Ortaklık Yapısı` olarak değerlendirilir.

## Nihai Hakim Ortak

Ana ortak ERP içindeki başka bir şirketse hesaplama o şirketin ortaklarına geçerek yukarı doğru devam eder. Gerçek kişiye, dış tüzel kişiye veya `is_ultimate_controller = true` kaydına ulaşıldığında nihai hakim ortak bulunur.

## Bağlı Şirket ve İştirak

Bir şirketin bağlı şirketleri ve iştirakleri, başka şirketlerin ortaklık kayıtlarında bu şirketin `source_type = grup_sirketi` ve `source_id = şirket id` olarak yer almasıyla hesaplanır.

Bağlı şirket varsayılan eşiği:

```text
share_ratio > 50 veya voting_ratio > 50 veya has_control_right = true
```

İştirak varsayılan eşiği:

```text
0 < share_ratio < 50
```

## Döngü Tespiti

Kurumsal yapı hesabı şirketler arası döngüyü algılar. Döngü bulunduğunda hesaplama durur ve uyarı üretir; uygulama çökmez.

## Tarihsel Ortaklık

Satırlar silinmez. Pay devri veya pasifleştirme yeni tarihsel durum yaratır. Takip edilen alanlar:

- `share_ratio`
- `voting_ratio`
- `profit_ratio`
- `control_type`
- `status`
- `start_date`
- `end_date`
- `source_id`

## Non-Destructive Delete

Silme yerine pasifleştirme uygulanır:

- `status = Pasif`
- `is_deleted = true`
- `deleted_at`
- `deleted_by`

Bu kural ortaklık, temsil ve resmi kamu kayıtları için ortak ERP davranışıdır.
