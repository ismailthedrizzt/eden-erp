# Organization Model

## Kapsam

Organization Model şirketin iç teşkilat yapısını yönetir. Bu model iç organizasyon içindir; dış partner, bayi ve distribütör ilişkileri Paydaşlar modülüne aittir.

## Ana Tablolar

Önerilen model mevcut tablolarla uyumlu genişletilmiştir:

- `birimler` / `organization_units`
- `organization_unit_types`
- `norm_kadrolar` / `positions`
- `position_assignments`
- `position_history`
- `organization_history`

## Unit Type Taxonomy

Birim tipi hardcoded enum olarak kullanılmaz. `organization_unit_types` tablosu tipleri taxonomy/label gibi yönetir.

Tip alanları:

- `name`
- `slug`
- `color`
- `icon`
- `parent_type_id`
- `sort_order`
- `is_active`

Varsayılan tipler:

- Genel Müdürlük
- Direktörlük
- Müdürlük
- Departman
- Bölüm
- Takım
- Şube
- Ofis
- Operasyon
- Proje Ofisi
- Komite
- Kurul
- Diğer

Kullanıcı yeni tip ekleyebilir, rename edebilir, renk/ikon verebilir ve parent type belirleyebilir.

## Hiyerarşi

Birim hiyerarşisi `birimler.ust_birim_id` ile kurulur. Tip hiyerarşisi öneri sağlar fakat kullanıcı override edebilir.

Örnek akıllı kurallar:

```text
Direktörlük → Müdürlük → Bölüm
Şube → Ofis
Operasyon → Takım
```

Bu kurallar validasyon ve öneri katmanıdır; veri modeli katı şekilde kilitlemez.

## Reorganization

Reorganizasyon bir birimin `ust_birim_id` değerinin değişmesidir. Bu değişiklik history içinde izlenir.

Örnek:

```text
Muhasebe Müdürlüğü → Finans Direktörlüğü altına taşındı
```

Takip edilen alanlar:

- Üst Birim
- Tip
- Kod
- Yerleşke
- Durum

## Soft Delete

Birimler fiziksel silinmez. Pasifleştirme şu alanları yazar:

- `status`
- `aktif`
- `is_deleted`
- `deleted_at`
- `deleted_by`

Bu sayede tarihsel organizasyon yapısı kaybolmaz.
