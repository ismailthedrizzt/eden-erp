# Action Center ve Bekleyen Isler

Action Center, kullanicinin bekleyen gorevlerini, onaylarini, tamamlanamayan islemlerini ve sistem uyarilarini tek is listesi olarak sunar. Amac teknik kaynaklari kullaniciya gostermek degil, "simdi ne yapmaliyim?" sorusuna cevap vermektir.

## Kaynaklar

- Notification: kullaniciya bilgi verir.
- Process Task: kullanicinin tamamlamasi gereken is adimidir.
- Approval: karar bekleyen resmi islemdir.
- Operation Request: sistemin yurutmeye calistigi islem kaydidir.
- Outbox Event: sistem ici guncelleme ve yayilim kaydidir.
- Projection Warning: liste veya ozet bilgilerin guncellenme durumudur.
- Action Center: bu kaynaklari tek, is diliyle okunur listeye cevirir.

## Kullanici Dili

Action Center teknik durumlari dogrudan gostermez.

- `operation_request failed` yerine "Tamamlanamayan islem var"
- `outbox pending` yerine "Sistem guncellemesi bekliyor"
- `projection stale` yerine "Liste bilgileri guncelleniyor"
- `approval pending` yerine "Onay bekleyen islem var"
- `task open` yerine "Tamamlanacak gorev var"

## Servis Katmani

`lib/action-center/actionCenterService.ts` process task, approval, operation request ve outbox event kaynaklarini okur. Eksik tablo veya view durumunda ilgili kaynak bos kabul edilir; kullanici teknik hata gormez.

Ana fonksiyonlar:

- `listActionCenterItems(context, query)`
- `getActionCenterCounts(context)`
- `getActionCenterSummary(context)`
- `listRecordActionItems(context, entityType, entityId)`
- `normalizeProcessTaskToActionItem`
- `normalizeApprovalToActionItem`
- `normalizeOperationToActionItem`
- `normalizeOutboxEventToActionItem`

## API

- `GET /api/action-center`
- `GET /api/action-center/counts`
- `GET /api/action-center/summary`
- `GET /api/action-center/by-record`

FastAPI migration sonrasi minimal canonical read adapter:

- `GET /api/v1/action-center`
- `GET /api/v1/action-center/counts`
- `GET /api/v1/action-center/summary`
- `GET /api/v1/action-center/by-record`

Bu ilk Python adapter process task ve process approval kaynaklarini okur. Operation failed/stuck ve outbox warning kaynaklari sonraki handler/read-model fazinda eklenecektir.

Eski `GET /api/notifications/pending-actions` endpoint'i uyumluluk icin korunur ve Action Center sonucunu eski response sekline cevirir.

## Scope ve Yetki

Action Center tenant ve company scope ile calisir. Kullanici kapsam disi sirketlere ait gorev, onay veya islem uyarilarini gormez. Outbox ve sistem uyarilari sadece sistem/ayar/audit yetkisi olan kullanicilara gosterilir.

## UI

- `ActionCenterBell`: ust barda acik is sayisini gosterir.
- `ActionCenterPanel`: gorev, onay, tamamlanamayan islem ve sistem uyarilarini listeler.
- `ActionCenterSummaryCards`: dashboard ozet kartlarini gosterir.
- `RecordPendingActionsPanel`: sirket veya sube detayinda o kayitla ilgili bekleyen isleri gosterir.

## Action Guide ve Tour

Action Guide context'i Action Center ozetini okuyabilir. Boylece ileride "sube kapanisi ne durumda?" gibi sorular ilgili surec gorevine veya onaya baglanabilir.

Guided Tour icinde Action Center adimi vardir: "Bekleyen gorevler, onaylar ve tamamlanamayan islemler burada gorunur."
