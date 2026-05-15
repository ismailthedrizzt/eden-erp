alter table if exists public.employees
  add column if not exists sgk_giris_yontemi text,
  add column if not exists sgk_giris_referans_no text,
  add column if not exists sgk_giris_bildiren text,
  add column if not exists sgk_giris_sigorta_kolu text,
  add column if not exists sgk_giris_gorev_kodu text,
  add column if not exists sgk_giris_meslek_kodu text,
  add column if not exists sgk_giris_csgb_is_kolu text,
  add column if not exists sgk_giris_engelli text,
  add column if not exists sgk_giris_eski_hukumlu text,
  add column if not exists sgk_giris_ogrenim_kodu text,
  add column if not exists sgk_giris_mezuniyet_yili text,
  add column if not exists sgk_giris_mezuniyet_bolumu text,
  add column if not exists sgk_giris_kismi_gun_sayisi text,
  add column if not exists sgk_cikis_yontemi text,
  add column if not exists sgk_cikis_referans_no text,
  add column if not exists sgk_cikis_bildiren text,
  add column if not exists sgk_cikis_nedeni text,
  add column if not exists sgk_cikis_meslek_kodu text,
  add column if not exists sgk_cikis_csgb_is_kolu text,
  add column if not exists sgk_cikis_ucret_yuzde_usulu text,
  add column if not exists sgk_cikis_onceki_belge_turu text,
  add column if not exists sgk_cikis_onceki_hakedilen_ucret text,
  add column if not exists sgk_cikis_bu_donem_belge_turu text,
  add column if not exists sgk_cikis_bu_donem_hakedilen_ucret text;

update public.employees
set
  sgk_giris_yontemi = coalesce(sgk_giris_yontemi, case when sgk_giris is not null then 'web' end),
  sgk_cikis_yontemi = coalesce(sgk_cikis_yontemi, case when isten_ayrilis is not null then 'web' end)
where sgk_giris is not null or isten_ayrilis is not null;
