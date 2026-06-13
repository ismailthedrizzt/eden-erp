# Rule Engine Safety

<!-- source-of-truth-standard: contract overrides markdown -->

Eden ERP rule engine guvenli varsayilanlarla tasarlanir.

## Hard Boundaries
- Kullanici tanimli kod calismaz.
- Kullanici tanimli SQL calismaz.
- Action template registry disina cikilmaz.
- Condition field registry disina cikilmaz.
- Tenant boundary her query ve action icin korunur.
- Company scope querylere tekrar uygulanir.

## Execution Identity
Kurallar `created_by` ve system automation actor bilgisiyle izlenir. Aksiyon audit metni `Automation rule X tarafindan olusturuldu` semantigini tasir.

## Side Effects
Bildirim, reminder, task ve report gibi yan etkiler best-effort calisir. Kritik domain mutationlari dogrudan yapilmaz; onay/gorev/oneri uretmek gerekir.

## Simulation
Simulation gercek action uretmez. Match sayisi, preview payload ve warning dondurur. Sensitive alanlar raw audit veya UI metnine yazilmaz.

## Throttling
`max_runs_per_day` ve `cooldown_minutes` spam ve recursive zincir riskini sinirlar. Event chain depth MVP'de 1 kabul edilir.
