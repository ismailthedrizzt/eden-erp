# ruff: noqa: E501
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FeatureFlagDefinition:
    key: str
    module_key: str
    label: str
    description: str
    default_enabled: bool = True
    dependencies: list[str] = field(default_factory=list)
    risk: str | None = None


FEATURE_FLAGS: list[FeatureFlagDefinition] = [
    FeatureFlagDefinition(
        key="actionGuide.enabled",
        module_key="settings",
        label="Islem Rehberi",
        description="Kullaniciyi dogru modul, kurulum veya resmi islem yoluna yonlendirir.",
    ),
    FeatureFlagDefinition(
        key="guidedTour.enabled",
        module_key="settings",
        label="Rehberli Tur",
        description="Urun ekranlarinda kisa tanitim turlari gosterir.",
    ),
    FeatureFlagDefinition(
        key="onboarding.enabled",
        module_key="settings",
        label="Ilk kurulum deneyimi",
        description="Yeni calisma alaninda karsilama, checklist ve baslangic adimlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="onboarding.workspaceChecklist",
        module_key="settings",
        label="Calisma alani checklist",
        description="Ilk sirket, modul hazirligi, tur ve Action Center adimlarini takip eder.",
    ),
    FeatureFlagDefinition(
        key="onboarding.firstRunWelcome",
        module_key="settings",
        label="Ilk giris karsilamasi",
        description="Kullaniciya ilk giriste sade baslangic mesajini gosterir.",
    ),
    FeatureFlagDefinition(
        key="search.enabled",
        module_key="settings",
        label="Global arama",
        description="Kayit, islem, rapor, belge ve ayarlari global arama ile bulur.",
    ),
    FeatureFlagDefinition(
        key="search.commandPalette",
        module_key="settings",
        label="Komut paleti",
        description="Ctrl/Cmd+K ile command palette deneyimini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="search.recentItems",
        module_key="settings",
        label="Son acilanlar",
        description="Kullanici bazli son acilan kayit ve sik kullanilan arama ogelerini tutar.",
    ),
    FeatureFlagDefinition(
        key="dataQuality.enabled",
        module_key="dataQuality",
        label="Veri kalitesi",
        description="Master data kalite skorlari, duplicate review ve governance sayfasini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="dataQuality.duplicateDetection",
        module_key="dataQuality",
        label="Duplicate detection",
        description="Master kisi/kurum, paydas, cari, calisan, asset ve belge duplicate adaylarini tespit eder.",
    ),
    FeatureFlagDefinition(
        key="dataQuality.merge",
        module_key="dataQuality",
        label="Guvenli merge",
        description="Yetkili kullanici onayiyla merge preview, relation impact ve auditli merge islemlerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="dataQuality.qualityScores",
        module_key="dataQuality",
        label="Kalite skorlari",
        description="Kayit bazli 0-100 kalite skoru, eksik alan ve relation warning hesaplar.",
    ),
    FeatureFlagDefinition(
        key="dataQuality.actionCenterWarnings",
        module_key="dataQuality",
        label="Action Center kalite uyarilari",
        description="Acil veri kalite bulgularini yetkili kullanicilar icin Action Center'a tasir.",
    ),
    FeatureFlagDefinition(
        key="dataQuality.importIntegration",
        module_key="dataQuality",
        label="Import duplicate entegrasyonu",
        description="Import validation sirasinda duplicate warning ve existing master onerilerini destekler.",
    ),
    FeatureFlagDefinition(
        key="adminConsole.enabled",
        module_key="adminConsole",
        label="Admin Console",
        description="Merkezi sistem yonetimi ve saglik dashboardunu etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="adminConsole.workspaceSettings",
        module_key="adminConsole",
        label="Calisma alani ayarlari",
        description="Dil, para birimi, timezone ve calisma alani profili yonetimini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="adminConsole.healthDashboard",
        module_key="adminConsole",
        label="Saglik dashboardu",
        description="Backend, DB, storage, outbox, worker ve readiness durumlarini gosterir.",
    ),
    FeatureFlagDefinition(
        key="adminConsole.outboxAdmin",
        module_key="adminConsole",
        label="Outbox admin",
        description="Failed outbox event retry ve dispatch-once araclarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="adminConsole.technicalPage",
        module_key="adminConsole",
        label="Teknik bilgiler",
        description="Secret gostermeyen system.admin teknik bilgiler sayfasini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="processEngine.enabled",
        module_key="process",
        label="Surec Motoru",
        description="Gorev, onay ve surec adimlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="auditLog.enabled",
        module_key="audit",
        label="Denetim Izi",
        description="Kritik islemler icin audit kaydi olusturur ve gorunur kilar.",
    ),
    FeatureFlagDefinition(
        key="actionCenter.enabled",
        module_key="actionCenter",
        label="Is Merkezi",
        description="Gorev, onay, tamamlanamayan islem ve sistem uyarilarini tek yerde toplar.",
        dependencies=["process", "audit"],
    ),
    FeatureFlagDefinition(
        key="reporting.savedViews",
        module_key="reporting",
        label="Kayitli gorunumler",
        description="Kullanici bazli ve paylasimli rapor filtre/kolon gorunumlerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="reporting.customReports",
        module_key="reporting",
        label="Ozel raporlar",
        description="Whitelist kaynaklardan ozel rapor tanimlari olusturmayi etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="reporting.scheduledReports",
        module_key="reporting",
        label="Zamanlanmis raporlar",
        description="Raporlarin gunluk/haftalik/aylik calismasini ve alicilara iletilmesini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="reporting.exportJobs",
        module_key="reporting",
        label="Export joblari",
        description="Rapor export isteklerini auditli job olarak yonetir.",
    ),
    FeatureFlagDefinition(
        key="reporting.dashboardPersonalization",
        module_key="reporting",
        label="Dashboard kisisellestirme",
        description="Kullanici dashboard kart sirasi, gizleme ve pinned rapor tercihlerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="reporting.crossModuleReports",
        module_key="reporting",
        label="Moduller arasi raporlar",
        description="Sirket 360, operasyon risk, finansal belge eksikligi, servis ve HR hazirlik raporlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="automation.enabled",
        module_key="automation",
        label="Workflow Automation",
        description="Registry kontrollu otomasyon kurali, calisma logu ve guvenli action template altyapisini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="automation.eventRules",
        module_key="automation",
        label="Event rules",
        description="Outbox/domain eventleri ile tetiklenen otomasyonlari etkinlestirir.",
        dependencies=["outbox"],
    ),
    FeatureFlagDefinition(
        key="automation.scheduledRules",
        module_key="automation",
        label="Scheduled rules",
        description="Saatlik/gunluk/haftalik/aylik otomasyon kural calismalarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="automation.conditionRules",
        module_key="automation",
        label="Condition rules",
        description="Whitelist projection ve tablo alanlari uzerinden kosul degerlendirmeyi etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="automation.ruleTemplates",
        module_key="automation",
        label="Rule templates",
        description="Hazir belge, gorev, CRM, servis, muhasebe ve HR otomasyon sablonlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="automation.simulation",
        module_key="automation",
        label="Rule simulation",
        description="Gercek aksiyon uretmeden matched record ve action preview hesaplamasini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="automation.emailActions",
        module_key="automation",
        label="Email actions",
        description="Otomasyon aksiyonlarinin e-posta kuyrugu entegrasyonunu etkinlestirir.",
        dependencies=["notifications"],
    ),
    FeatureFlagDefinition(
        key="automation.taskActions",
        module_key="automation",
        label="Task actions",
        description="Otomasyonlardan proje/surec takip gorevi uretimini etkinlestirir.",
        dependencies=["project_management"],
    ),
    FeatureFlagDefinition(
        key="automation.notificationActions",
        module_key="automation",
        label="Notification actions",
        description="Otomasyonlardan bildirim ve Is Merkezi uyarisi uretimini etkinlestirir.",
        dependencies=["notifications"],
    ),
    FeatureFlagDefinition(
        key="aiCopilot.enabled",
        module_key="aiCopilot",
        label="AI Copilot",
        description="Baglamsal AI paneli, kayit ozeti ve guvenli islem rehberligini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="aiCopilot.recordSummary",
        module_key="aiCopilot",
        label="Kayit ozeti",
        description="Secili kayit, pending action, belge ve kalite uyarilarini ozetler.",
    ),
    FeatureFlagDefinition(
        key="aiCopilot.formAssist",
        module_key="aiCopilot",
        label="Form assist",
        description="Kullanici metninden form alan onerileri uretir; mutation yapmaz.",
    ),
    FeatureFlagDefinition(
        key="aiCopilot.documentIntelligence",
        module_key="aiCopilot",
        label="Belge zekasi",
        description="Belge ozeti ve alan cikarim onerilerini insan onayi gerektiren taslak olarak uretir.",
        dependencies=["documents"],
    ),
    FeatureFlagDefinition(
        key="aiCopilot.safeActions",
        module_key="aiCopilot",
        label="Safe AI actions",
        description="Registry kontrollu action preview ve guvenli yonlendirme kartlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="aiCopilot.adminAssist",
        module_key="aiCopilot",
        label="Admin assist",
        description="Kurulum, readiness, feature flag ve sistem sagligi eksiklerini yetkili kullaniciya aciklar.",
    ),
    FeatureFlagDefinition(
        key="aiCopilot.feedback",
        module_key="aiCopilot",
        label="AI feedback",
        description="Kullanici AI cevap kalitesi icin geri bildirim verebilir.",
    ),
    FeatureFlagDefinition(
        key="aiCopilot.history",
        module_key="aiCopilot",
        label="AI history",
        description="Sanitize edilmis AI cevap gecmisini kullanici ve admin icin saklar.",
    ),
    FeatureFlagDefinition(
        key="customerPortal.enabled",
        module_key="customerPortal",
        label="Musteri portali",
        description="Dis musterilerin kendi urun, servis, belge ve bildirimlerine sinirli erisimini etkinlestirir.",
        dependencies=["crm", "after_sales"],
    ),
    FeatureFlagDefinition(
        key="customerPortal.serviceRequests",
        module_key="customerPortal",
        label="Portal servis talepleri",
        description="Portal kullanicisinin scoped kurulu urun icin servis talebi olusturmasini etkinlestirir.",
        dependencies=["after_sales"],
    ),
    FeatureFlagDefinition(
        key="customerPortal.installedAssets",
        module_key="customerPortal",
        label="Portal kurulu urunleri",
        description="Musteriye ait kurulu urunleri portalda listeler.",
        dependencies=["after_sales"],
    ),
    FeatureFlagDefinition(
        key="customerPortal.documents",
        module_key="customerPortal",
        label="Portal belgeleri",
        description="Paylasilmis belge goruntuleme ve sinirli belge yukleme akisini etkinlestirir.",
        dependencies=["documents"],
    ),
    FeatureFlagDefinition(
        key="customerPortal.notifications",
        module_key="customerPortal",
        label="Portal bildirimleri",
        description="Musteri odakli bildirim listesini etkinlestirir.",
        dependencies=["notifications"],
    ),
    FeatureFlagDefinition(
        key="customerPortal.invitations",
        module_key="customerPortal",
        label="Portal davetleri",
        description="Internal kullanicinin musteri portal kullanicisi davet etmesini etkinlestirir.",
        dependencies=["crm"],
    ),
    FeatureFlagDefinition(
        key="customerPortal.branding",
        module_key="customerPortal",
        label="Portal marka ayarlari",
        description="Portal shell icinde musteri/tenant odakli sade marka gorunumunu etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="customerPortal.customerComments",
        module_key="customerPortal",
        label="Portal musteri yorumlari",
        description="Portal servis taleplerine musteri yorumu ve ek bilgisi kabul eder.",
    ),
    FeatureFlagDefinition(
        key="branches.facilityAutoCreate",
        module_key="branches",
        label="Sube acilisinda tesis/lokasyon olusturma",
        description="Sube Acilisi sirasinda tesis/lokasyon kaydinin otomatik olusmasini saglar.",
        dependencies=["facilities"],
    ),
    FeatureFlagDefinition(
        key="branches.organizationAutoCreate",
        module_key="branches",
        label="Sube acilisinda organizasyon birimi olusturma",
        description=(
            "Sube Acilisi sirasinda organizasyon birimi kaydinin otomatik "
            "olusmasini saglar."
        ),
        dependencies=["organization"],
    ),
    FeatureFlagDefinition(
        key="branches.documentUpdate",
        module_key="branches",
        label="Sube belge guncelleme",
        description="Sube belgeleri icin ayri belge guncelleme akisini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="representatives.scopeAuthority",
        module_key="representatives",
        label="Kapsam bazli temsil yetkisi",
        description=(
            "Temsil yetkilerini sirket geneli, sube, organizasyon veya tesis "
            "kapsamina indirger."
        ),
        dependencies=["branches", "organization", "facilities"],
    ),
    FeatureFlagDefinition(
        key="facilities.freeCreate",
        module_key="facilities",
        label="Serbest tesis/lokasyon olusturma",
        description=(
            "Tesisler/Lokasyonlar sayfasindan subeden bagimsiz fiziksel "
            "lokasyon olusturulabilsin."
        ),
    ),
    FeatureFlagDefinition(
        key="organization.positionManagement",
        module_key="organization",
        label="Kadro/Pozisyon yonetimi",
        description="Organizasyon birimleri altinda kadro ve pozisyon yonetimini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="audit.export",
        module_key="audit",
        label="Denetim raporu disa aktarimi",
        description="Denetim izi raporlarinin maskeli CSV/Excel ciktisini etkinlestirir.",
        risk="Disa aktarim yetkisi ve tarih araligi zorunlu olmalidir.",
    ),
    FeatureFlagDefinition(
        key="dataImport.enabled",
        module_key="importExport",
        label="Data import",
        description="Sablonlu dosya yukleme, mapping, validation ve onayli import akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="dataImport.csv",
        module_key="importExport",
        label="CSV import",
        description="CSV dosyalarindan import parse akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="dataImport.xlsx",
        module_key="importExport",
        label="XLSX import",
        description="XLSX dosyalarindan import parse akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="dataExport.enabled",
        module_key="importExport",
        label="Data export",
        description="Maskeli ve auditli CSV export job akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="bulkOperations.enabled",
        module_key="importExport",
        label="Bulk operations",
        description="Kontrollu bulk action dry-run ve confirm akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="bulkOperations.confirmationRequired",
        module_key="importExport",
        label="Bulk onay zorunlulugu",
        description="Bulk action icin dry-run sonrasi kullanici onayi gerektirir.",
    ),
    FeatureFlagDefinition(
        key="documents.enabled",
        module_key="documents",
        label="Belge yonetimi",
        description="Merkezi belge metadata, relation ve storage akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.preview",
        module_key="documents",
        label="Belge onizleme",
        description="Belge onizleme icin kontrollu signed URL uretimini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.versioning",
        module_key="documents",
        label="Belge versiyonlama",
        description="Replace/new version akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.verification",
        module_key="documents",
        label="Belge dogrulama",
        description="Belge verify/reject statulerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.accessLogs",
        module_key="documents",
        label="Belge erisim loglari",
        description="Belge view/download/preview erisimlerini loglar.",
    ),
    FeatureFlagDefinition(
        key="documents.mobileCameraUpload",
        module_key="documents",
        label="Mobil kamera yukleme",
        description="Mobil cihazlarda fotograf cek/yukle inputunu etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.requirements",
        module_key="documents",
        label="Belge gereksinimleri",
        description="Operation bazli required/optional belge slotlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="documents.signedUrlDownload",
        module_key="documents",
        label="Signed URL ile indirme",
        description="Belge indirme/onizleme icin kisa omurlu signed URL uretir.",
    ),
    FeatureFlagDefinition(
        key="documents.expiryAlerts",
        module_key="documents",
        label="Belge sure uyarilari",
        description="Suresi dolan ve 30 gun icinde dolacak belgeleri Action Center'a tasir.",
    ),
    FeatureFlagDefinition(
        key="notifications.enabled",
        module_key="notifications",
        label="Bildirimler",
        description="Kullanici bildirimlerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="notifications.inApp",
        module_key="notifications",
        label="Uygulama ici bildirim",
        description="Header bildirim paneli ve okunmamis sayaci etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="notifications.email",
        module_key="notifications",
        label="E-posta bildirimi",
        description="Bildirimlerden e-posta kuyrugu olusturulmasini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="notifications.reminders",
        module_key="notifications",
        label="Hatirlatmalar",
        description="Zamanlanmis reminder batch islerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="notifications.digest",
        module_key="notifications",
        label="Bildirim ozeti",
        description="Gunluk/haftalik digest tercihlerini etkinlestirir.",
        default_enabled=False,
    ),
    FeatureFlagDefinition(
        key="notifications.systemWarnings",
        module_key="notifications",
        label="Sistem uyarilari",
        description="Sistem ve guvenlik uyarilarini ilgili yetkililere iletir.",
    ),
    FeatureFlagDefinition(
        key="notifications.emailTemplates",
        module_key="notifications",
        label="E-posta sablonlari",
        description="Baslangic e-posta sablonlarini ve degisken render altyapisini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="process.approvals",
        module_key="process",
        label="Surec onaylari",
        description="Surec icinde onay bekleyen adimlari etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="process.tasks",
        module_key="process",
        label="Surec gorevleri",
        description="Kullanicilara atanabilen surec gorevlerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="hr.leaveManagement",
        module_key="hr",
        label="Izin yonetimi",
        description="Izin turleri, izin talepleri, onay ve bakiye takibini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="hr.attendance",
        module_key="hr",
        label="Devam-devamsizlik",
        description="Manuel devam kayitlari, devamsizlik ve fazla mesai hazirligini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="hr.workSchedules",
        module_key="hr",
        label="Calisma planlari",
        description="Haftalik calisma plani ve calisana plan atamalarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="hr.timesheets",
        module_key="hr",
        label="Puantaj",
        description="Puantaj donemi, hesaplama, onay ve kilit akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="hr.payrollPreparation",
        module_key="hr",
        label="Bordro hazirligi",
        description="Puantajdan bordro hazirlik verisi uretimini etkinlestirir; tutar hesaplamaz.",
    ),
    FeatureFlagDefinition(
        key="hr.leaveApprovals",
        module_key="hr",
        label="Izin onaylari",
        description="Izin onay bekleyen islerini Action Center ve bildirimlere tasir.",
    ),
    FeatureFlagDefinition(
        key="hr.overtime",
        module_key="hr",
        label="Fazla mesai",
        description="Devam kayitlarinda fazla mesai saatlerini hesaplar ve puantaja tasir.",
    ),
    FeatureFlagDefinition(
        key="hr.attendanceImport",
        module_key="hr",
        label="Devam import",
        description="Manuel import hazirligi icin toplu devam kaydi endpointini etkinlestirir.",
        default_enabled=False,
    ),
    FeatureFlagDefinition(
        key="crm.leads",
        module_key="crm",
        label="Lead yonetimi",
        description="Lead kaydi, kaynak, durum ve duplicate uyarilarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="crm.opportunities",
        module_key="crm",
        label="Firsat yonetimi",
        description="Satis firsatlari, tutar, olasilik ve kapanis takibini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="crm.pipeline",
        module_key="crm",
        label="Pipeline",
        description="Pipeline ve asama bazli firsat takibini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="crm.followups",
        module_key="crm",
        label="Takip otomasyonu",
        description="Next follow-up tarihi gelen lead/firsatlari Action Center ve gorevlere tasir.",
    ),
    FeatureFlagDefinition(
        key="crm.proposals",
        module_key="crm",
        label="Teklif baglantisi",
        description="Firsat uzerinde teklif belge durumu ve hazirlik baglantilarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="crm.leadConversion",
        module_key="crm",
        label="Lead donusumu",
        description="Lead kaydini paydas, musteri ve firsata donusturme akislarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="crm.opportunityKanban",
        module_key="crm",
        label="Firsat kanban",
        description="Pipeline kolonlari ile firsat board gorunumunu etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="crm.crmNotifications",
        module_key="crm",
        label="CRM bildirimleri",
        description="Lead atama, takip zamani ve firsat asamasi bildirimlerini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="afterSales.maintenancePlanning",
        module_key="after_sales",
        label="Bakim planlama",
        description="Periyodik bakim plani ve bakimi gelen kayitlari etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="afterSales.fieldService",
        module_key="after_sales",
        label="Saha servis",
        description="Teknisyen atama ve saha gorevi akisini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="afterSales.mobileServiceFlow",
        module_key="after_sales",
        label="Mobil servis akisi",
        description="Teknisyen icin mobil uyumlu servis akis ekranini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="afterSales.serviceChecklist",
        module_key="after_sales",
        label="Servis checklist",
        description="Servis checklist sablonlari ve sonuc kayitlarini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="afterSales.partsUsed",
        module_key="after_sales",
        label="Kullanilan parcalar",
        description="Serviste kullanilan malzeme hazirlik verisini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="afterSales.customerSignature",
        module_key="after_sales",
        label="Musteri imzasi",
        description="Servis raporu icin musteri imzasi placeholder alanini etkinlestirir.",
        default_enabled=False,
    ),
    FeatureFlagDefinition(
        key="afterSales.serviceReport",
        module_key="after_sales",
        label="Servis raporu",
        description="Servis raporu onizleme verisini etkinlestirir.",
    ),
    FeatureFlagDefinition(
        key="afterSales.warrantyCheck",
        module_key="after_sales",
        label="Garanti kontrolu",
        description="Kurulu urun garanti kontrolunu servis akisina baglar.",
    ),
    FeatureFlagDefinition(
        key="afterSales.technicianAssignment",
        module_key="after_sales",
        label="Teknisyen atama",
        description="Teknisyen user/calisan atama akislarini etkinlestirir.",
    ),
]

_FEATURE_BY_KEY = {flag.key: flag for flag in FEATURE_FLAGS}
_TENANT_FEATURE_OVERRIDES: dict[str, dict[str, bool]] = {}


def list_feature_flags(module_key: str | None = None) -> list[FeatureFlagDefinition]:
    flags = FEATURE_FLAGS
    if module_key:
        flags = [flag for flag in flags if flag.module_key == module_key]
    return list(flags)


def get_feature_flag(key: str) -> FeatureFlagDefinition | None:
    return _FEATURE_BY_KEY.get(key)


def is_feature_enabled(tenant_id: str, key: str) -> bool:
    tenant_overrides = _TENANT_FEATURE_OVERRIDES.get(tenant_id, {})
    if key in tenant_overrides:
        return tenant_overrides[key]
    flag = get_feature_flag(key)
    return flag.default_enabled if flag else True


def set_feature_enabled(tenant_id: str, key: str, enabled: bool) -> bool:
    if key not in _FEATURE_BY_KEY:
        return False
    _TENANT_FEATURE_OVERRIDES.setdefault(tenant_id, {})[key] = enabled
    return True


def feature_flag_payload(
    flag: FeatureFlagDefinition,
    *,
    tenant_id: str,
) -> dict[str, object]:
    return {
        "key": flag.key,
        "module_key": flag.module_key,
        "label": flag.label,
        "description": flag.description,
        "default_enabled": flag.default_enabled,
        "enabled": is_feature_enabled(tenant_id, flag.key),
        "dependencies": flag.dependencies,
        "risk": flag.risk,
    }
