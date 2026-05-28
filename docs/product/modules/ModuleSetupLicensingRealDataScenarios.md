# Module Setup / Licensing Real Data Scenarios

## Scenario 1 - Hazır çalışma alanı

1. Şirketlerimiz, Ortaklarımız ve Temsilcilerimiz aktif.
2. Kurulum Merkezi modülleri "Kullanıma hazır" gösterir.
3. Sidebar ve action buttonları aktif görünür.

## Scenario 2 - Şubeler modülü kapalı

1. Branches disabled yapılır.
2. Sidebar veya Şube Açılışı aksiyonu disabled reason gösterir.
3. Action Guide "Modül Ayarlarına Git" önerir.
4. FastAPI action eligibility işlem başlatmaz.

## Scenario 3 - Ortaklarımız kurulumu eksik

1. Current ownership view eksiktir.
2. Kurulum Merkezi "Ortaklık dağılımı görünümü hazır değil" anlamında setup_required gösterir.
3. Sermaye Artırımı disabled olur.
4. Backend precheck `MODULE_SETUP_REQUIRED` döner.

## Scenario 4 - Facility auto create kapalı

1. `branches.facilityAutoCreate` false yapılır.
2. Şube Açılışı wizardında facility otomatik oluşturma seçeneği disabled görünür.
3. Helper "Bu özellik çalışma alanınızda kapalı" der.

## Scenario 5 - Audit lisanssız

1. Audit module not_included/unlicensed görünür.
2. Audit menüsü lock/unavailable state gösterir.
3. Kullanıcı lisans sayfasına yönlenir.

## Scenario 6 - Readiness infrastructure eksik

1. Partners modülü açık, fakat `v_current_ownership` yok.
2. Kurulum Merkezi setup_required gösterir.
3. Sermaye Artırımı engellenir.

## Scenario 7 - Admin feature flag değiştirir

1. Admin `representatives.scopeAuthority` açar.
2. Temsilci wizard kapsam seçeneklerini gösterir.
3. FastAPI eligibility feature flag açık olduğu için devam eder.

## Scenario 8 - Normal kullanıcı ayar değiştiremez

1. Normal kullanıcı feature flag PATCH dener.
2. API permission denied döner.
3. UI iş diliyle yetki mesajı gösterir.
