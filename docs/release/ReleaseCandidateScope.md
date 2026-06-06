# Release Candidate Scope

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: 1830fa4 manual_field_test_execution_plan
- Ortam: uzak sunucu, local PostgreSQL/local DB, Next.js UI/BFF, FastAPI canonical backend
- Test edilen kapsam: release guard, env guard, DB target guard, migration/boundary/openapi guard, build, backend ruff/mypy/pytest, health smoke, field-test register incelemesi
- Karar: FIX_BEFORE_RELEASE_CANDIDATE
- Sonraki adım: manuel field test ilk turu + P1 backend/test cleanup + tekrar gate

## A. Release Candidate Kapsamına Alınabilecek Çekirdek Modüller

- Login
- Ana Sayfa / Dashboard temel görünüm
- Şirketlerimiz
- Ortaklarımız
- Temsilcilerimiz
- Şubelerimiz
- Teşkilat / Kadro
- Tesisler / Lokasyonlar
- Çalışanlar
- Cari Kartlar
- Cari Hareketler
- Belgeler, sadece güvenli ve test edilmiş kapsam
- Action Center, çekirdek uyarılar
- Audit, admin/authorized kapsam
- Release Guard

## B. Development'ta Kalacak Ama Test Edilebilir Modüller

- CRM / Paydaşlar
- Proje / Görev Yönetimi
- Satış Sonrası
- Ürün / Hizmetler
- Sözleşmeler
- Import / Export
- Data Quality
- Gelişmiş Raporlama
- Bildirimler

## C. Release Dışında Kalacak / Future Modüller

- AI Copilot
- Customer Portal
- Integration Hub
- Automation Rule Engine
- Advanced Reporting full scope
- Tam bordro
- Tam e-Fatura / banka API entegrasyonu
- E-imza
- Sözleşme müzakere portalı
- OCR / AI belge analizi

## Release Registry Kuralı

Release registry'de yalnız A kapsamındaki, field testte geçti veya kabul edilebilir sınırlı geçti olarak işaretlenen sayfalar release statüsünde kalabilir. B ve C kapsamındaki sayfalar development, development_internal veya hidden kalmalıdır. Release ortamında development, beta, debug veya status badge kullanıcıya gösterilmemelidir.
