# Document Management Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Sirket acilis belgesi

1. Kullanici Sirket Acilisi wizardini acar.
2. `trade_registry_gazette` required belge olarak gorunur.
3. Belge yuklenmeden ilerleme operation guard tarafindan engellenir.
4. Belge `documents` tablosunda `owner_entity_type=company` ile gorunur.
5. Iliski `document_relations` tablosunda `relation_type=primary` olarak tutulur.

## Scenario 2 - Temsilci yetki belgesi

1. Kullanici Temsilcilik Baslatma akisinda banka yetkisi secer.
2. `bank_authority_document` required olur.
3. Dosya Document Loader ile yuklenir.
4. Verification status `pending` olur.
5. Admin belgeyi dogrular veya reddeder.

## Scenario 3 - Calisan ozluk belgesi

1. Kullanici calisan detayinda belge slotlarini acar.
2. Kimlik, sozlesme ve SGK belgesi yuklenir.
3. Expiry date verilen belgeler expiring endpointlerinde gorunur.
4. Ise giris transaction dogrudan belge yukleme ile olusmaz.

## Scenario 4 - Servis fotografi

1. Mobil servis kaydi ekraninda kamera inputu acilir.
2. Fotograf cekilir veya yuklenir.
3. Belge `relation_type=service_photo` ile servis kaydina baglanir.
4. Preview icin backend kisa omurlu signed URL uretir.

## Scenario 5 - Import error report

1. Import validation failed olur.
2. Error report `document_type=import_error_report` olarak Document domain'e baglanabilir.
3. Import job detayinda download aksiyonu backend permission kontrolunden gecer.

## Scenario 6 - Belge reddi

1. Admin belgeyi preview ile inceler.
2. Reddet aksiyonunda red nedeni girer.
3. `status=rejected`, `verification_status=rejected` olur.
4. Action Center ilgili kullaniciya belge uyarisi gosterir.

## Scenario 7 - Signed URL guvenligi

1. Kullanici belge indirme talebi yapar.
2. Backend tenant, permission ve scope kontrolu yapar.
3. Supabase Storage icin kisa omurlu signed URL uretir.
4. `document_access_logs` kaydi olusur.
5. Audit payload'inda signed URL bulunmaz.

