# Ortaklar Sekmesi

## Amaç

Ortaklar sekmesi şirketin gerçek kişi ve tüzel kişi ortaklarını, pay detaylarını, ekonomik haklarını ve tarihsel ortaklık kayıtlarını yönetir.

## Seçim Akışı

Kayıt ekleme akışı soldan sağa ilerler:

1. Ortak Türü
2. Kaynak Türü
3. Kayıt Seçimi
4. Ortaklık Detayları
5. Ortağı Kaydet

Önceki adım tamamlanmadan sonraki adım aktif olmaz.

## Ortak Türü ve Kaynaklar

Gerçek Kişi kaynakları:

- Çalışan
- Mevcut Temsilci
- Harici Kişi
- Yeni Kişi

Tüzel Kişi kaynakları:

- Cari
- Paydaş
- Grup Şirketi
- Harici Şirket
- Yeni Şirket

UI içinde `Personel`, `Delete`, `Remove` veya `Shareholder` etiketi kullanılmaz.

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
- Temsil Yetkisi Var mı?
- Yönetim Kurulu Aday Hakkı Var mı?
- Nihai Faydalanıcı mı?
- Notlar
- Belge Referansı

Zorunlu alanlar:

- Ortak Türü
- Kaynak Türü
- Kayıt Seçimi
- Başlangıç Tarihi
- Durum
- Hisse Oranı, Sermaye Tutarı veya Pay Adedi alanlarından en az biri

## Hisse Türü

Desteklenen türler:

- Adi Pay
- İmtiyazlı Pay
- Nama Yazılı
- Hamiline
- Kurucu Payı
- Yatırımcı Payı
- Diğer

## Durum

Desteklenen durumlar:

- Aktif
- Pasif
- Devredildi
- Askıda
- Tasfiye Sürecinde

## Koşullu Gösterimler

- Kaynak Çalışan ise `Çalışan Ortak` etiketi gösterilir.
- Kaynak Grup Şirketi ise `Grup İçi Ortaklık` etiketi gösterilir.
- Hisse oranı %50 üzerindeyse `Kontrol Hissesi` badge'i gösterilir.
- Nihai Faydalanıcı seçilirse `Nihai Faydalanma Oranı` ve `Açıklama` alanları açılır.

## Toplamlar

Sekmede toplam paneli bulunur:

- Toplam Hisse
- Aktif Ortak Sayısı
- Gerçek Kişi Ortak Sayısı
- Tüzel Kişi Ortak Sayısı
- Kontrol Ortağı

Aktif ortaklık toplamı 100% değilse uyarı gösterilir.

## Pay Devri

`Pay Devri` işlemi modal üzerinden yapılır:

- Devreden Ortak
- Devralan Ortak
- Devir Tarihi
- Devir Oranı
- Belge Referansı
- Not

Sistem devreden satırı kısmen veya tamamen kapatır, devralan için yeni tarihsel satır oluşturur.

## Geçmiş

Takip edilen değişiklikler:

- share_ratio
- capital_amount
- voting_right
- profit_share
- status
- owner
- dates

Her satırda `Geçmiş` ikonu bulunur. Panelde eski değer, yeni değer, değiştirme tarihi ve değiştiren gösterilir.

## Silme Kuralı

Ortak satırları fiziksel olarak silinmez. `Pasifleştir` işlemi `status`, `is_deleted`, `deleted_at` ve geçmiş alanlarını günceller.
