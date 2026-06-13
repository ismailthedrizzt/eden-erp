# Release Candidate Go/No-Go Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

## Go İçin Zorunlu Checklist

### Auth / Access

- [ ] Login gerçek kullanıcıyla çalışıyor.
- [ ] App session cookie set ediliyor ve korunuyor.
- [ ] Yetkisiz kullanıcı protected route'a erişemiyor.
- [x] Release guard teknik olarak çalışıyor.

### Core ERP

- [ ] Şirket taslağı oluşturuldu.
- [ ] Şirket açılışı tamamlandı.
- [ ] Ortak kartı oluşturuldu.
- [ ] İlk ortaklık girişi tamamlandı.
- [ ] Temsilci kartı oluşturuldu.
- [ ] Temsilcilik başlatıldı.
- [ ] Şube açılışı tamamlandı.
- [ ] Çalışan kartı oluşturuldu.
- [ ] İşe giriş tamamlandı.
- [ ] Cari kart oluşturuldu.
- [ ] Cari hareket oluşturuldu.
- [ ] Sermaye artırımı tamamlandı.
- [ ] Pay devri tamamlandı.

### Documents

- [ ] Belge yükleme çalışıyor.
- [ ] Duplicate reuse çalışıyor.
- [ ] Media access auth/scope ile çalışıyor.
- [ ] Required document warning doğru.

### Audit / Action

- [ ] Action Center çekirdek uyarılar iş diliyle görünüyor.
- [ ] Kritik işlemler audit timeline'a düşüyor.

### Ops

- [x] Build geçiyor.
- [x] Typecheck geçiyor.
- [ ] Backend tests geçiyor.
- [x] DB target check geçiyor.
- [x] Env safety geçiyor.
- [ ] Backup alınabiliyor.

## No-Go Tetikleyicileri

Açık P0, kırık login, belirsiz release DB, user-visible stack trace, tenant/scope leak, operation-controlled field bypass veya document/media security issue görülürse release candidate başlatılmaz.
