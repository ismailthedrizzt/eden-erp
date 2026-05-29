# AI Advanced Assistance E2E Checklist

Playwright config mevcut degilse bu dosya regression hazirligi olarak tutulur.

## Seed Data

- Aktif sirket, ortaklik, temsilci ve sube kaydi
- Document metadata/text extract kaydi
- Cari hareket veya servis talebi formu
- Action registry icinde enabled ve disabled action
- Audit permission'i olan ve olmayan iki kullanici

## Test Basliklari

- Copilot paneli global olarak acilir.
- Sayfa context'i ile explain cevabi alinir.
- Secili kayit icin record summary uretilir.
- Disabled action reason backend'den gorunur.
- Registry disi action reddedilir.
- Kritik action direct execution olarak aktif olmaz.
- Form assist alan onerileri uretir ve mutation yapmaz.
- Document summary/extract onerileri `requires_human_verification` ile gelir.
- Audit permission olmayan kullanici audit detayini alamaz.
- Provider kapaliyken deterministic fallback cevap doner.
- Feedback endpoint'i olumlu/olumsuz kaydi kabul eder.
- Mobil viewport'ta Copilot panel bottom sheet gibi kullanilabilir.

## Manuel Regression

1. `/app` icinde Copilot button gorunur.
2. "Bu sayfa ne ise yarar?" sorusu structured cevap dondurur.
3. "Bu kaydi ozetle" selected entity context'iyle calisir.
4. "Sermayeyi degistir" critical action'i sadece wizard yonlendirmesi yapar.
5. Form assist bir task/service/accounting taslagi uretir.
6. Document Intelligence belge turu ve alan onerisi uretir.
7. History listesi izin varsa gorunur.
8. Teknik hata son kullaniciya raw stack trace olarak gosterilmez.
