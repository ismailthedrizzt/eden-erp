# Position Model

## Amaç

Position Model norm kadro, açık pozisyon ve dolu pozisyon kontrolünü yönetir. Eski `norm_kadrolar` tablosu genişletilerek modern `positions` davranışı kazanır.

## Alanlar

Pozisyon alanları:

- `unit_id` / `birim_id`
- `title`
- `grade`
- `reports_to_position_id`
- `is_manager`
- `norm_count`
- `active_count`
- `budget_code`
- `work_type`
- `status`

## Kadro Tablosu

Birim formundaki Kadro sekmesi şu kolonları gösterir:

- Unvan
- Kademe
- Amir mi
- Norm Adet
- Dolu Adet
- Boş Adet
- Durum
- İşlemler

## Kadro Overlay

SmartList işlem kolonundaki `Kadro` butonu sağ overlay açar. Overlay hızlı operasyon içindir:

- Unit Name
- Open Positions
- Filled Positions
- Stats
- Quick Add Position

Form sekmesindeki Kadro tam detay, overlay ise hızlı işlem katmanıdır.

## Amir Kuralı

Varsayılan olarak bir birimde yalnızca bir aktif amir pozisyonu önerilir. Birimde aktif amir varken yeni amir eklenirse uyarı gösterilir:

```text
Bu birimde aktif bir amir zaten mevcut.
```

Bu uyarı gelecekte ayarla override edilebilir.

## Çalışan Bağlantısı

Dolu pozisyonlar Çalışanlar Modülü ile ilişkilidir. Pozisyon satırı personel bağlantısı varsa:

```text
Ahmet Kaya (Muhasebe Müdürü)
```

Boşsa:

```text
Boş Kadro
```

Açık pozisyonlarda operasyon butonları gösterilir:

- İşe Alım Talebi Aç
- İlan Aç
- Transfer Talebi Aç

## Soft Delete

Pozisyonlar fiziksel silinmez. Kapatma/pasifleştirme şunları yazar:

- `status`
- `durum`
- `is_deleted`
- `deleted_at`
- `deleted_by`

## History

Takip edilen alanlar:

- Norm Kadro
- Amir
- Üst Pozisyon
- Durum

Değişiklikler `history`, `position_history` ve workflow entegrasyonları için saklanır.
