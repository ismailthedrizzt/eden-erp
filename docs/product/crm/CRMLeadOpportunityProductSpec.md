# CRM Deepening - Lead / Opportunity / Follow-up Automation

## Amac

CRM modulu paydas karti seviyesinden lead, firsat, pipeline, takip ve etkilesim yonetimi omurgasina genisler. Finansal cari hareket, fatura, tam teklif PDF veya marketing otomasyonu bu fazin kapsami degildir.

## Kapsam

- Lead kaydi, kaynak, durum, duplicate uyarisi ve sorumlu kullanici.
- Opportunity/firsat kaydi, pipeline asamasi, olasilik, agirlikli deger ve beklenen kapanis.
- Varsayilan satis pipeline ve asama olasiliklari.
- Follow-up due/overdue listesi, tamamlama ve erteleme.
- Lead/firsat/stakeholder etkilesim gecmisi.
- Lead -> stakeholder/customer ve opsiyonel opportunity donusumu.
- Opportunity teklif belge baglantisi ve teklif durumu.
- Action Center, Notification, Project/Task ve Reporting entegrasyonlari best-effort.

## Modeller

Lead `crm_leads` tablosunda tutulur. Telefon, e-posta ve firma adi duplicate adaylari olarak raporlanir; lead cari kart degildir.

Opportunity `crm_opportunities` tablosunda tutulur. `estimated_value`, `probability` ve `weighted_value` pipeline gorunumu ve raporlama icin kullanilir. Won/lost durumlari satis sonucudur; accounting kaydi yaratmaz.

Pipeline `crm_pipelines` ve `crm_pipeline_stages` tablolarindan gelir. Baslangic asamalari: Yeni Firsat, Ilk Temas, Ihtiyac Analizi, Teklif Hazirligi, Teklif Gonderildi, Muzakere, Kazanildi, Kaybedildi.

Interaction mevcut `crm_interactions` tablosunun lead/opportunity baglantilariyla genisletilmis halidir.

## API

- `GET/POST /api/v1/crm/leads`
- `GET/PATCH /api/v1/crm/leads/{lead_id}`
- `POST /api/v1/crm/leads/{lead_id}/qualify|convert|mark-lost`
- `GET/POST /api/v1/crm/opportunities`
- `GET/PATCH /api/v1/crm/opportunities/{opportunity_id}`
- `POST /api/v1/crm/opportunities/{opportunity_id}/stage|mark-won|mark-lost|create-followup-task|upload-proposal`
- `GET/POST /api/v1/crm/pipelines`
- `GET /api/v1/crm/pipelines/{pipeline_id}/stages`
- `PATCH /api/v1/crm/pipeline-stages/{stage_id}`
- `GET/POST /api/v1/crm/interactions`
- `GET/POST /api/v1/crm/leads/{lead_id}/interactions`
- `GET/POST /api/v1/crm/opportunities/{opportunity_id}/interactions`
- `GET /api/v1/crm/followups/due`
- `POST /api/v1/crm/followups/{entity_type}/{entity_id}/complete|snooze`

## Permissions

Yeni izinler: `crm.leadsView`, `crm.leadsEdit`, `crm.leadsConvert`, `crm.opportunitiesView`, `crm.opportunitiesEdit`, `crm.opportunityStageChange`, `crm.opportunityWinLoss`, `crm.pipelineManage`, `crm.interactionsManage`, `crm.followupManage`, `crm.proposalManage`.

## Reporting

Dashboard KPI'lari yeni lead, qualified lead, acik firsat, pipeline degeri, agirlikli pipeline, geciken takip, gonderilen teklif ve bu ay beklenen kapanislari kapsar.

Raporlar: `lead_status_report`, `opportunity_pipeline_report`, `followup_due_report`, `won_lost_report`, `lead_source_report`, `owner_performance_report`.

## Acceptance Criteria

Lead ve opportunity CRUD calisir; pipeline asama degisimi weighted value hesaplar; follow-up Action Center'a duser; lead conversion paydas/firsat yaratabilir; proposal belge baglantisi tutulur; Next proxy FastAPI sozlesmesini bozmaz; build/typecheck/test gecmelidir.
