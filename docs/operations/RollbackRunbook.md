# Rollback Runbook

## Amac

Production release sonrasi guvenli uygulama, worker, feature flag veya migration rollback'i yapmak.

## Kim Kullanir

Incident commander, engineering lead, release owner.

## On Kosullar

- Etkilenen release version, migration id ve feature flag listesi bilinir.
- P0/P1 kriteri kaydedilir.
- Worker backlog ve outbox status ekranlari aciktir.

## Adimlar

1. Incident severity belirle.
2. Yeni release'i durdur; gerekirse deploy pipeline'i pause et.
3. Worker'lari pause et veya scale-to-zero yap.
4. Feature flag ile riskli yuzeyi kapat.
5. Backend onceki uyumlu versiyona rollback et.
6. Frontend onceki versiyona rollback et.
7. Outbox/webhook backlog'u incele; duplicate side effect riskinde manual retry yapma.
8. Smoke test calistir.
9. Kullanici iletisimini ve postmortem kaydini baslat.

## Migration Rollback

- Destructive migration rollback otomatik uygulanmaz.
- Index ekleme rollback'i index drop olabilir.
- Column/table drop veya data transform varsa restore/reconciliation plani gerekir.
- Geriye uyumlu app rollback yoksa `NOT_READY` kabul edilir ve hotfix hazirlanir.

## Kontrol Listesi

- API health ok.
- Auth/login ok.
- Tenant/scope negative smoke ok.
- Worker paused/resumed karari kayitli.
- Outbox failed count artmiyor.
- Error rate baseline'a dondu.

## Audit/Log Referanslari

- Release id, commit sha, migration id.
- Admin feature flag audit.
- Worker pause/resume action.
- Incident ticket and timeline.
