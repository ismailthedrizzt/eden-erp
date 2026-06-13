# Demo Data Reset Guide

<!-- source-of-truth-standard: contract overrides markdown -->

Demo seed altyapisi pilot verisini deterministic ID'lerle olusturur. Reset islemi
yalnizca seed manifestindeki demo ID'leri temizler; gercek pilot kullanici verisi
metadata filtresiyle topluca silinmez.

## Dry-run

```bash
npm run demo:seed:dry
```

Beklenen:
- DB baglantisi gerektirmez.
- Toplam kayit sayisini ve tablo dagilimini listeler.
- Production guard'i yazma yapmadigi icin tetiklemez.

## Seed

```bash
npm run demo:seed
```

Kurallar:
- `APP_ENV=production` ise mutating seed engellenir.
- Idempotent calisir; ayni demo ID'leri tekrar upsert eder.
- Eksik tablolar skipped olarak raporlanir.

## Reset + Re-seed

```bash
npm run demo:seed -- --reset-demo-data --confirm-reset
```

Kurallar:
- `--confirm-reset` olmadan reset calismaz.
- Reset sirasi child tablolardan parent tablolara dogrudur.
- Sadece manifestteki deterministic demo ID'ler silinir.

## Module-only Seed

```bash
npm run demo:seed -- --module notifications
```

Not:
- Module filter yalnizca `module_key` tasiyan kayitlari daraltir.
- Core tenant/workspace kayitlari her zaman dahil edilir.

## Validation

```bash
npm run demo:validate
```

Beklenen:
- Read-only calisir.
- DB yoksa `not_configured` raporu verir.
- `--strict` ile eksik veri CI'da fail ettirilebilir:

```bash
python backend/scripts/validate_demo_data.py --strict
```

## Production Guard Test

```bash
APP_ENV=production npm run demo:seed
```

Beklenen:
- Script hata verir ve veri yazmaz.

