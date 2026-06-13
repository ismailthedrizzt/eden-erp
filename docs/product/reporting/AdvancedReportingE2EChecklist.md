# Advanced Reporting E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

Playwright config mevcut degilse bu dosya regression hazirligi olarak tutulur.

## Seed Data

- En az bir company ve branch.
- Accounting cari transaction ve document needed kaydi.
- HR employee ve timesheet/leave hazirlik kaydi.
- Project task overdue kaydi.
- After-sales service request ve maintenance due kaydi.
- CRM lead/opportunity follow-up kaydi.
- Farkli permission setlerine sahip iki kullanici.

## Checklist

- Saved view create.
- Saved view apply.
- Saved view pin ve default yap.
- Shared view role/user scope disina veri tasirmiyor.
- Custom report predefined source ile create.
- Custom report saved view source ile create.
- Custom report free SQL kabul etmiyor.
- Report catalog sistem ve custom raporlari listeliyor.
- Scheduled report create.
- Scheduled report pause/resume.
- Scheduled report run-now.
- Recipient permission fail olunca skipped run log olusuyor.
- Export job create.
- Export row limit buyuk raporu engelliyor.
- Export download URL sadece completed job icin donuyor.
- Dashboard preferences save/reset.
- Action Center failed scheduled report gosteriyor.
- Action Center failed export job gosteriyor.
- Yetkisiz kullanici financial/HR/audit raporu goremez.
- Teknik hata ham stack trace olarak kullaniciya gosterilmez.

## Manual Smoke Flow

1. `/app/raporlama/ozel-raporlar` acilir.
2. Kaynak rapor secilir ve ozel rapor kaydedilir.
3. Saved view kaydedilir.
4. Export job olusturulur.
5. `/app/raporlama/zamanlanmis-raporlar` acilir.
6. Weekly scheduled report olusturulur.
7. `Simdi Calistir` aksiyonu denenir.
8. Dashboard preference kaydedilir.

