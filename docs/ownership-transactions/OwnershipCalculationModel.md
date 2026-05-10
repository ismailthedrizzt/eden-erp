# Ownership Calculation Model

Güncel ortaklık değerleri yalnızca onaylı işlemlerden hesaplanır.

Hesaba giren kayıt koşulları:

```text
approval_status = approved
status = active
effective_date <= today
is_deleted = false
```

`Yeni Ortak Girişi`, devralan/yeni ortak için pay, oy, kar payı, sermaye ve pay adedi yaratır. `Pay Devri` ve `Kısmi Pay Devri`, devreden ortaktan düşer ve devralan ortağa eklenir. `Ortaklıktan Çıkış` devreden/çıkan ortak üzerinde azaltıcı etki oluşturur. Hak tanımı ve düzeltme işlemleri etkilenen ortak üzerinden değerlendirilir.

Onaylanmış geçmiş sessizce değiştirilmez. Hatalı onaylı kayıtlar için `Ters Kayıt` veya `Düzeltme Kaydı` oluşturulur.

Hesaplama uyarıları:

- Toplam hisse 100% değil
- Toplam oy hakkı 100% değil
- Birden fazla kontrol sahibi var
- Devreden ortağın yeterli payı yok
- Tarihsel çakışma riski
- Döngüsel ortaklık riski
