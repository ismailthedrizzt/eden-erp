# Cross-Domain Consistency Checks

<!-- source-of-truth-standard: contract overrides markdown -->

Cross-domain consistency, Eden ERP'de sirket, sube, ortak, temsilci, organizasyon ve tesis/lokasyon verilerinin birbirini bozmadan calismasini saglayan kontrol ailesidir.

## Kontrol Alanlari

### Sirket

- Resmi islemler aktif sirketlerde baslatilir.
- Terkin edilmis sirketlerde yeni resmi islem baslatilmaz.
- Sermaye ve ortaklik islemleri icin guncel ortaklik dagilimi gerekir.
- Tasfiye/terkin oncesi acik sube ve bagli yetkiler etki olarak incelenir.

### Sube

- Kapanacak sube aktif ve ayni sirket kapsaminda olmalidir.
- Sube organizasyon ve tesis baglantilari ayni sirket altinda olmalidir.
- Sube kapatilirken sube kapsamindaki aktif temsilci yetkileri impact uyarisi verir.
- Ayni sube icin acik surec varsa yeni kapanis/opening islemi engellenir.
- Ayni adla aktif sube varsa sube acilisi engellenir.

### Temsilci

- Ayni kisi/kurum ayni sirket icinde ikinci temsilci kartina donusmez.
- Sube/organizasyon/facility scope ayni sirket altinda ve aktif olmalidir.
- Kapali/pasif kapsam icin yeni aktif yetki verilemez.
- Ayni temsilci + ayni scope + ayni yetki tipinde cakisma uyarisi uretilebilir.

### Ortaklik

- Current ownership dagilimi okunabilir olmalidir.
- Sermaye artirimi icin aktif ortaklik dagilimi gerekir.
- Acik/pending ortaklik islemi varsa yeni islem engellenebilir.
- Pay dagilimi yuzde 100 degilse warning uretilir.

### Organizasyon ve Tesis

- Organizasyon birimi ayni sirket altinda olmalidir.
- Kapanis/ayirma oncesi aktif bagli kayitlar impact uyarisi uretir.
- Tesis/lokasyon ayni sirket altinda ve aktif olmalidir.

## Eksik Altyapi

Eksik tablo, view veya kurulum hatasi kullaniciya teknik detay olarak gosterilmez. Gerekirse "kurulum durumunu kontrol et" gibi setup action onerilir.

## FastAPI Guard Katmani

Cross-domain consistency artik Python guard akisiyle de temsil edilir:
readiness, policy ve integrity sirasi mutation oncesinde calisir. Branch,
capital, representative authority ve ownership transaction operasyonlari bu
guardlari kullanmaya basladi. Detaylar:
[Policy / Integrity / Readiness FastAPI Migration](./PolicyIntegrityReadinessFastAPIMigration.md).
