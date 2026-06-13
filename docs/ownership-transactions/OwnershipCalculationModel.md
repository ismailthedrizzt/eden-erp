# Ownership Calculation Model

<!-- source-of-truth-standard: contract overrides markdown -->

Güncel ortaklık durumu yalnızca onaylı Ortaklık İşlemleri kayıtlarından hesaplanır.

```text
approval_status = approved
status = active
effective_date <= today
is_deleted = false
```

`OwnershipCalculationService` pay, oy hakkı, kar payı, sermaye tutarı, pay adedi ve ortaklık kaynaklı imtiyazları üretir. Cari Hareketler hiçbir koşulda hisse, oy, kar payı, sermaye hakkı, imtiyazlı pay veya kontrol hakkı doğurmaz; sadece ödeme takibini etkiler.

İşlem etkisi:

- `Yeni Ortak Girişi`: yeni ortağa hisse, oy, kar payı ve varsa sermaye taahhüdü ekler.
- `Pay Devri` / `Kısmi Pay Devri`: devreden ortaktan düşer, devralan ortağa eklenir.
- `Ortaklıktan Çıkış`: çıkan ortağın devredilecek payını düşer.
- `Sermaye Taahhüdü`: hak/taahhüt üretir, ödeme girişi yapmaz.
- `Sermaye Artırımı` / `Sermaye Azaltımı`: onaylı işlem olarak sermaye ve pay etkisini üretir.
- `Oy Hakkı Değişikliği`, `Kar Payı Oranı Değişikliği`, `İmtiyazlı Pay Tanımı/Kaldırma`: yalnızca ortaklık kaynaklı hakları günceller.
- `Düzeltme Kaydı` ve `Ters Kayıt`: onaylı geçmişi sessizce değiştirmeden yeni tarihsel kayıt oluşturur.

Uyarılar en az şu durumları kapsar: toplam hisse 100% değil, toplam oy hakkı 100% değil, devreden ortağın yeterli payı yok ve temsil yetkisi alanı Ortaklık İşlemleri içinde kullanılmaya çalışılıyor.
