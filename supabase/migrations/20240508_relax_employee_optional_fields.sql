DO $$
DECLARE
  target_table TEXT;
  target_column TEXT;
  optional_columns TEXT[] := ARRAY[
    'askerlik_durumu',
    'tecil_tarihi',
    'is_telefonu',
    'acil_kisi_ad',
    'acil_kisi_soyad',
    'acil_kisi_yakinlik',
    'acil_kisi_telefon',
    'sgk_giris',
    'gorev',
    'ust_beden',
    'alt_beden',
    'ayakkabi',
    'kep',
    'iban',
    'notlar',
    'fotograf_url'
  ];
BEGIN
  FOREACH target_table IN ARRAY ARRAY['employees', 'personel'] LOOP
    FOREACH target_column IN ARRAY optional_columns LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = target_table
          AND column_name = target_column
          AND is_nullable = 'NO'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL',
          target_table,
          target_column
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
