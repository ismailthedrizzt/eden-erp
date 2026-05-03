# Ortaklar Sekmesi

## Amaç

Ortaklar sekmesi şirket formu içinde ownership kayıtlarını yönetir. Bağımsız Ortaklar sayfası ise aynı kayıtları kurumsal yapı hesaplama ekranı olarak kullanır.

## Seçim Akışı

Kayıt ekleme akışı:

1. Ortak Türü
2. Kaynak Türü
3. Kayıt Seçimi
4. Ortaklık Detayları
5. Ortağı Kaydet

## Ortak Türü ve Kaynaklar

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

`Tüzel Kişi + Grup Şirketi` seçimi ERP içindeki başka bir şirket kaydına işaret eder ve kurumsal yapı hesabında kullanılır.

## Ortaklık Detayları

Alanlar:

- Başlangıç Tarihi
- Bitiş Tarihi
- Durum
- Hisse Türü
- Pay Adedi
- Nominal Değer
- Sermaye Tutarı
- Hisse Oranı (%)
- Oy Hakkı (%)
- Kar Payı Oranı (%)
- Kontrol Hakkı Var mı?
- Kontrol Türü
- Yönetim Kurulu Aday Hakkı Var mı?
- Veto Hakkı Var mı?
- İmtiyazlı Pay Var mı?
- Nihai Faydalanıcı mı?
- Nihai Faydalanma Oranı (%)
- Nihai Hakim Ortak mı?
- Notlar
- Belge Referansı

## Durum

Desteklenen durumlar:

- Aktif
- Pasif
- Devredildi
- Askıda
- Tarihsel

## Koşullu Gösterimler

- Kaynak Çalışan ise `Çalışan Ortak` etiketi gösterilir.
- Kaynak Grup Şirketi ise `Grup İçi Ortaklık` etiketi gösterilir.
- Hisse veya oy oranı %50 üzerindeyse kontrol rozeti gösterilir.
- Nihai Faydalanıcı seçilirse nihai faydalanma oranı ve nihai hakim ortak alanları açılır.

## Toplamlar

Sekmede toplam paneli bulunur:

- Toplam Hisse
- Aktif Ortak Sayısı
- Gerçek Kişi Ortak Sayısı
- Tüzel Kişi Ortak Sayısı
- Kontrol Ortağı

Aktif ortaklık toplamı 100% değilse uyarı gösterilir.

## Geçmiş

Takip edilen değişiklikler:

- `share_ratio`
- `voting_ratio`
- `profit_ratio`
- `control_type`
- `status`
- `start_date`
- `end_date`
- `source_id`

## Silme Kuralı

Ortak satırları fiziksel olarak silinmez. `Pasifleştir` işlemi `status`, `is_deleted`, `deleted_at` ve geçmiş alanlarını günceller.
