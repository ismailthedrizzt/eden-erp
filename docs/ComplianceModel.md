# Compliance Model

## Amaç

Compliance modeli şirketin resmi yükümlülüklerini izlemek için Kamu sekmesindeki verileri temel alır. Vergi, SGK, sicil, ruhsat, teşvik ve dijital kanal kayıtları aynı şirket kimliği altında toplanır.

## Veri Kaynakları

- Vergi: `company_public_tax`
- SGK: `company_public_sgk`
- Teşvikler: `company_public_incentives`
- Sicil: `company_public_registry`
- Ruhsatlar: `company_public_licenses`
- Dijital Kanallar: `company_public_channels`

Her kayıt `company_id` ile şirket kaydına bağlanır. Tekil kurum alanlarında şirket başına tek kayıt, ruhsatlarda şirket başına çoklu kayıt desteklenir.

## Reminder Logic

Ruhsat bitiş tarihi bugünden sonraki 30 gün içindeyse arayüzde `Yakında Süresi Doluyor` rozeti gösterilir.

Ruhsat kaydındaki `reminder_days` alanı ileride bildirim motoruna aktarılacak esnek eşik değeridir. Varsayılan kullanım 30 gündür.

Planlanan otomasyon sinyalleri:

- Ruhsat bitiş tarihi yaklaştı
- Mali mühür bitiş tarihi yaklaştı
- Teşvik bitiş tarihi yaklaştı
- Son kamu kontrol tarihi gecikti
- Borç takibi aktif ve son kontrol tarihi boş

## Status Tracking

Compliance durumu kurum bazlı hesaplanır:

- Vergi: e-belge, mali mühür, vergi borcu takibi ve son kontrol tarihi
- SGK: sicil no, tehlike sınıfı, teşvik, borç takibi ve son kontrol tarihi
- Ruhsatlar: aktif, süresi yaklaşıyor, süresi doldu, pasif ve iptal durumları
- Dijital Kanallar: KEP, e-tebligat ve web servis entegrasyon hazırlığı

## History Logic

Ana şirket alanlarındaki hassas değişiklikler `sirketler.field_history` içinde tutulur. Kamu alt tablolarındaki `history` JSONB alanları kurum bazlı geçmiş için ayrılmıştır.

Hassas izlenen alanlar:

- Vergi Dairesi
- NACE
- Tehlike Sınıfı
- MERSİS
- KEP
- Ruhsat Durumu

Tooltip formatı eski değer, yeni değer, değişiklik tarihi ve değiştiren kullanıcı bilgisini göstermelidir.

## Soft Delete

Resmi kayıtlar fiziksel olarak silinmez. Ruhsat pasifleştirme şu alanları yazar:

- `is_deleted`
- `deleted_at`
- `deleted_by`

API, güncelleme sırasında payload içinde artık bulunmayan ruhsatları da aynı kuralla pasifleştirir.

## Entegrasyon Hazırlığı

Model web servis entegrasyonlarına genişleyebilir şekilde tasarlanmıştır. Kurum servisleri `last_check_date`, `history`, `api_notes`, durum alanları ve belge tarihlerini güncelleyebilir. Bu sayede ileride GİB/SGK/KOSGEB/KEP/e-tebligat kontrolleri aynı compliance ekranlarına veri sağlayabilir.
