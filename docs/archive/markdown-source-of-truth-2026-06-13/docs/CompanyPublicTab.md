# Kamu Sekmesi

## Amaç

Kamu sekmesi şirketin resmi kurum ilişkileri merkezidir. GİB, SGK, KOSGEB, Ticaret Sicil, MERSİS, İŞKUR, ruhsatlar, KEP, e-tebligat ve diğer kamu kanalları aynı form mimarisi içinde izlenir.

Bu yapı ileride web servis entegrasyonları, belge hatırlatmaları, durum takibi, uygunluk kontrolleri ve otomasyonlar için veri kaynağı olarak kullanılacaktır.

## Alt Sekmeler

- Vergi
- SGK
- Teşvikler
- Sicil
- Ruhsatlar
- Dijital Kanallar
- Geçmiş

## Kurum Bazlı Alanlar

Vergi alanı vergi numarası, vergi dairesi, vergi türü, mükellefiyet başlangıcı, e-fatura/e-arşiv/e-irsaliye durumları, GİB kullanıcı kodu, mali mühür ve vergi borcu takibini yönetir. E-fatura aktif olduğunda GİB kullanıcı kodu ve mali mühür alanları görünür.

SGK alanı işyeri sicil no, il, şube, tescil tarihi, NACE kodu, tehlike sınıfı, teşvik kullanımı, çalışan sayısı ve borç takibini tutar. Teşvik kullanımı aktif olduğunda aktif teşvik türü ve bitiş tarihi gösterilir.

Teşvikler alanı KOSGEB kaydı, KOSGEB no, destek programı, başvuru tarihi, sonuç durumu, teşvik türü, bitiş tarihi, sorumlu ve notları içerir.

Sicil alanı MERSİS, ticaret sicil no, tescil müdürlüğü, oda sicil no, bağlı oda, kuruluş tescil tarihi, son değişiklik tarihi ve tasfiye durumunu izler.

Dijital Kanallar alanı KEP, e-tebligat, e-devlet yetki durumu, resmi bildirim email/telefon ve web servis entegrasyon notlarını tutar.

## Çoklu Ruhsat Yapısı

Ruhsatlar çoklu kayıt yapısındadır. Her satır ruhsat türü, belge no, veren kurum, başlangıç/bitiş tarihi, durum, belge dosyası ve hatırlatma süresini içerir.

Ruhsat bitiş tarihi bugünden sonraki 30 gün içindeyse `Yakında Süresi Doluyor` uyarı rozeti gösterilir.

Kullanıcı aksiyonları:

- Ruhsat Ekle
- Düzenle
- Pasifleştir
- Geçmiş

## History Logic

Hassas alanlarda history ikonu gösterilir:

- Vergi Dairesi
- NACE
- Tehlike Sınıfı
- MERSİS
- KEP
- Ruhsat Durumu

Tooltip eski değer, yeni değer, değişiklik tarihi ve değiştiren kullanıcı bilgisini gösterecek şekilde hazırlanmıştır. Ana şirket alanları mevcut `field_history` yapısını okur; Kamu alt tablolarında `history` JSONB alanı ileride servis bazlı değişiklikleri saklamak için ayrılmıştır.

## Soft Delete

Resmi kayıtlar fiziksel olarak silinmez. Ruhsat pasifleştirme satır üzerinde şu alanları yazar:

- `is_deleted`
- `deleted_at`
- `deleted_by`

Eksik gönderilen ruhsat kayıtları da API tarafında aynı soft delete kuralıyla pasife alınır.

## Veri Modeli

Kamu verisi şirket kaydına `company_id` ile bağlı ayrı tablolarda tutulur:

- `company_public_tax`
- `company_public_sgk`
- `company_public_incentives`
- `company_public_registry`
- `company_public_licenses`
- `company_public_channels`

Tekil kurum alanlarında `company_id` unique tutulur. Ruhsatlar çoklu kayıt olduğu için `company_id` üzerinden indekslenir.

## Entegrasyon Hazırlığı

Alanlar kurum bazlı ayrıldığı için ileride GİB, SGK, KOSGEB, KEP veya e-tebligat web servisleri her sekmeye kendi kontrol tarihini, entegrasyon durumunu ve otomasyon çıktısını yazabilir. `last_check_date`, `debt_tracking_active`, `has_web_service_integration`, `api_notes`, `history` ve ruhsat hatırlatma alanları bu hazırlığın ilk katmanıdır.
