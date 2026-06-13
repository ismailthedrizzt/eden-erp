# Pilot Known Risks

<!-- source-of-truth-standard: contract overrides markdown -->

## P1 Riskler

- Final gate sonucu `READY_WITH_P1_DEBT`; pilot kontrollu kapsamla yapilmali.
  Onlem: `docs/release/MVPReleaseReadinessReport.md` ve final smoke checklist pilot oncesi onaylanmali.
- Gercek SMTP yanlislikla acilirsa demo kullanicilarina e-posta gidebilir.
  Onlem: Pilot ortamda email sandbox veya `EMAIL_ENABLED=false`.
- Production ortamda seed calistirma riski.
  Onlem: Seed script production guard icerir; yine de deployment runbook'ta komutlar ayrilmali.
- Demo verisi ile gercek pilot verisinin karismasi.
  Onlem: deterministic demo IDs ve demo metadata kullanilir; reset yalnizca manifest ID'lerini siler.

## P2 Riskler

- Bazi ekranlar henuz alpha/dev seviyesinde oldugu icin demo fallback path gerekebilir.
- Search sonuc kalitesi ILIKE/index MVP seviyesindedir; typo tolerance yoktur.
- Document preview storage config yoksa yalnizca metadata gosterilebilir.
- Email worker calismiyorsa failed email sadece admin ekraninda gorulur.

## Demo Sirasinda Dikkat

- Secret, token, database URL veya service role key gosteren ekran acilmaz.
- Gercek TCKN/VKN olmadigi acikca belirtilir.
- Tamamlanmamis future entegrasyonlar "planned" olarak anlatilir.
- Bulk/import islemlerinde dry-run ve confirm prensibi vurgulanir.

## Fallback Demo Path

1. Dashboard acilmazsa Admin Console / Saglik ekranina gec.
2. Search sonuc gec gelirse ilgili liste ekranindan kaydi ac.
3. Belge preview yoksa documents metadata ve signed URL prensibini anlat.
4. Worker yoksa failed outbox/email queue kaydini goster.
