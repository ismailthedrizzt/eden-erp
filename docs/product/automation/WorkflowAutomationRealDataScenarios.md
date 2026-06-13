# Workflow Automation Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Belge suresi uyarisi
1. 30 gun icinde suresi dolan belge var.
2. Gunluk kural calisir.
3. HR/admin notification ve Action Center warning alir.

## Scenario 2 - CRM follow-up
1. Opportunity `next_followup_date` gecmistir.
2. Kural project task olusturur.
3. Owner Action Center'da gorur.

## Scenario 3 - Servis bakim uyarisi
1. Maintenance due 7 gun icindedir.
2. Kural servis talebi onerisi/action item olusturur.

## Scenario 4 - Unmatched bank transaction
1. 3 gunden eski unmatched banka hareketi vardir.
2. Kural accounting warning olusturur.

## Scenario 5 - Temsil yetkisi bitis
1. Yetki 30 gun icinde bitmektedir.
2. Kural temsilci yoneticisine bildirim verir.

## Scenario 6 - Rule simulation
1. Admin belge expiry rule test eder.
2. 5 kaydin eslesecegi gosterilir.
3. Gercek notification olusmaz.

## Scenario 7 - Rule cooldown
1. Ayni kural son calismasindan kisa sure sonra tekrar tetiklenir.
2. Cooldown icinde notification spam yapilmaz.

## Scenario 8 - Permission guard
1. Otomasyon task olusturmak ister.
2. Project module veya permission hazir degilse action skipped olur ve run log warning tasir.
