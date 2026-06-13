# Pilot Environment Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Ortam

- [ ] Ortam staging/demo olarak isaretli.
- [ ] `APP_ENV` production degil.
- [ ] FastAPI ayakta.
- [ ] Next.js ayakta.
- [ ] Worker/outbox process ayakta veya bilincli kapali.
- [ ] Database baglantisi var.
- [ ] Storage test bucket configured.
- [ ] Email sandbox veya disabled.
- [ ] `NEXT_PUBLIC_DEMO_MODE=true` ise header badge gorunur.

## Demo Veri

- [ ] Demo tenant olustu.
- [ ] Workspace settings demo degerleriyle dolu.
- [ ] Demo users ve roller olustu.
- [ ] Aktif ana sirket var.
- [ ] Ikinci aktif sirket var.
- [ ] Taslak sirket var.
- [ ] Tasfiye senaryosu sirketi var.
- [ ] Ortaklar ve %100 current ownership senaryosu var.
- [ ] Temsilci yetki senaryolari var.
- [ ] Sube/facility/unit baglantilari var.
- [ ] Cari kart ve cari hareketler var.
- [ ] HR, proje/gorev, servis, CRM kayitlari var.
- [ ] Belgeler, audit, notification ve data quality uyarilari var.

## Kontrol Komutlari

```bash
npm run demo:seed:dry
npm run demo:seed -- --reset-demo-data --confirm-reset
npm run demo:validate
```

## Manuel Smoke

- [ ] Dashboard dolu.
- [ ] Action Center demo item gosteriyor.
- [ ] Global Search "EDEN" sonuc donduruyor.
- [ ] "PlaneGuard" aramasi urun/asset sonuc donduruyor.
- [ ] Admin Console saglik ekraninda secret yok.
- [ ] Audit kayitlari gorunuyor.
- [ ] Belgeler indirilebilir/preview akisi yetki kontrollu.
- [ ] Standard User scope disi kaydi goremiyor.

## Guvenlik

- [ ] Gercek secret ekranda yok.
- [ ] Gercek TCKN/VKN yok.
- [ ] E-posta sandbox/disabled.
- [ ] Export limitleri pilot icin uygun.
- [ ] Backup/snapshot alindi.

