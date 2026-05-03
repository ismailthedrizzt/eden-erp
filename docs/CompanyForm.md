# Şirket Formu

## Genel Yapı

Şirket formu standart `EntityForm` şablonunu kullanır. Hero alanı şirket kimlik bilgileri, logo slotları ve belge slotlarından oluşur. Detay bilgileri sekmeler altında yönetilir.

## Hero Alanı

Zorunlu alanlar:

- Ticari Ünvan
- Şirket Türü
- VKN
- Vergi Dairesi

VKN sadece 10 haneli sayı kabul eder. Kısa Ünvan Hero alanında gösterilmez; veri kaydında Ticari Ünvan üzerinden türetilir.

Beklenen resimler:

- Orijinal Logo
- Dark Mode Logo

Beklenen belgeler:

- Vergi Levhası
- Ticaret Sicil Gazetesi
- İmza Sirküleri
- Faaliyet Belgesi

Belge yükleyici PDF ve resim dosyalarında thumbnail/preview gösterir.

## Sekmeler

Mevcut sekme yapısı:

- Ortaklar
- Temsilciler
- Adres
- İletişim
- Tescil
- Vergi ve SGK
- Ayarlar

Sekme başlığı renkleri yalnızca o sekmedeki ana form alanlarının doğrulama durumuna göre değişir. Liste içi geçici draft alanları, ilgili kayıt listeye eklenmeden sekme rengini boyamaz.

## Ortaklar

Ortaklar sekmesi gerçek kişi ve tüzel kişi ownership kayıtlarını yönetir. Progressive akışla ortak türü, kaynak türü, kayıt seçimi ve ortaklık detayları girilir. Toplam hisse, aktif ortak sayıları, kontrol ortağı ve 100% toplam uyarısı bu sekmede gösterilir. Pay devri fiziksel silme yapmadan tarihsel satır üretir.

## Temsilciler

Temsilci kayıtları bağımsız Temsilciler sayfasında yönetilir. Şirket formundaki ilgili özetler bu sayfadan çekilir. Detay form davranışı `docs/RepresentativesPage.md` içinde açıklanmıştır.

## Veri Kaydetme

Form kaydı şirket ana alanlarını, Hero asset JSON alanlarını, ortakları ve temsilcileri birlikte gönderir. Temsilci pasifleştirme fiziksel silme yapmaz; satır üzerinde `is_deleted`, `deleted_at` ve geçmiş bilgisi tutulur.

## Gelecek İş Akışı Entegrasyonu

Temsilci yetkileri ileride onay akışlarında kullanılacaktır. Ödeme, satınalma, sözleşme, SGK ve GİB süreçleri ilgili temsilci yetkilerini okuyarak uygun onay ve işlem adımlarını belirleyebilir.
