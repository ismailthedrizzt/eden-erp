-- Reset personel table (delete all data and reset sequence)
-- WARNING: This will delete all personel records

-- Delete all data
TRUNCATE TABLE public.personel RESTART IDENTITY CASCADE;

-- Reset UUID sequence (for PostgreSQL gen_random_uuid, no manual reset needed)
-- If using serial ID, you would use: ALTER SEQUENCE personel_id_seq RESTART;
