# Şirket Formu

## Genel Yapı

Şirket formu standart ERP form mimarisini kullanır. Hero alanı şirket kimlik bilgileri, logo slotları ve belge slotlarından oluşur. Detay bilgileri sekmeler altında yönetilir.

## Hero Alanı

Zorunlu alanlar:

- Ticari Ünvan
- Şirket Türü
- Vergi Dairesi

VKN Temel Kimlik Sorgulama/Oluşturma alanında alınır ve sadece 10 haneli sayı kabul eder. Kısa Ünvan veri kaydında ve liste görünümünde şirketin kısa adı olarak kullanılabilir, ancak zorunlu değildir.

Beklenen resimler:

- Orijinal Logo
- Dark Mode Logo

Beklenen belgeler:

- Vergi Levhası
- Ticaret Sicil Gazetesi
- Sicil Tasdiknamesi

Belge yükleyici PDF ve resim dosyalarında thumbnail/preview gösterir.

## Sekmeler

Mevcut sekme yapısı:

- Kurumsal Kimlik
- Vergi ve SGK Bilgileri
- Kamu
- Ortaklar
- Temsilciler
- ERP Ayarları

Sekme başlığı renkleri yalnızca o sekmedeki ana form alanlarının doğrulama durumuna göre değişir. Liste içi geçici draft alanları, ilgili kayıt listeye eklenmeden sekme rengini boyamaz.

## Kamu

Kamu sekmesi resmi kurum ilişkileri merkezidir. Vergi, SGK, Teşvikler, Sicil, Ruhsatlar, Dijital Kanallar ve Geçmiş alt sekmelerinden oluşur.

Kamu verileri şirket ana tablosundan ayrı kurum bazlı tablolarda saklanır:

- `company_public_tax`
- `company_public_sgk`
- `company_public_incentives`
- `company_public_registry`
- `company_public_licenses`
- `company_public_channels`

Ruhsatlar çoklu kayıt yapısındadır. Silme yerine pasifleştirme kullanılır. Bitiş tarihi 30 gün içinde olan ruhsatlarda uyarı rozeti gösterilir.

Detay davranışı `docs/CompanyPublicTab.md` içinde açıklanmıştır.

## Ortaklar

Ortaklar sekmesi gerçek kişi ve tüzel kişi ownership kayıtlarını yönetir. Progressive akışla ortak türü, kaynak türü, kayıt seçimi ve ortaklık detayları girilir. Toplam hisse, aktif ortak sayıları, kontrol ortağı ve 100% toplam uyarısı bu sekmede gösterilir. Pay devri fiziksel silme yapmadan tarihsel satır üretir.

## Temsilciler

Temsilci kayıtları bağımsız Temsilciler sayfasında yönetilir. Şirket formundaki ilgili özetler bu sayfadan çekilir. Detay form davranışı `docs/RepresentativesPage.md` içinde açıklanmıştır.

## Veri Kaydetme

Form kaydı şirket ana alanlarını, Hero asset JSON alanlarını, ortakları, temsilcileri ve Kamu sekmesi verilerini birlikte gönderir. Temsilci ve resmi ruhsat pasifleştirme fiziksel silme yapmaz; satır üzerinde `is_deleted`, `deleted_at` ve geçmiş bilgisi tutulur.

## Gelecek İş Akışı Entegrasyonu

Temsilci yetkileri ve Kamu kayıtları ileride onay akışlarında, belge hatırlatmalarında ve kamu entegrasyonlarında kullanılacaktır. Ödeme, satınalma, sözleşme, SGK ve GİB süreçleri ilgili temsilci yetkilerini ve Kamu sekmesi durumlarını okuyarak uygun onay ve işlem adımlarını belirleyebilir.
