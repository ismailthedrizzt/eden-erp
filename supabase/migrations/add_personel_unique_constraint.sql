-- Add unique constraint on uyruk + (tc_kimlik or pasaport_no)
-- This prevents duplicate entries for the same person

-- First, remove any existing duplicates
DELETE FROM public.personel p1
USING (
  SELECT uyruk, tc_kimlik, pasaport_no, MIN(id) as min_id
  FROM public.personel
  GROUP BY uyruk, tc_kimlik, pasaport_no
  HAVING COUNT(*) > 1
) p2
WHERE p1.uyruk = p2.uyruk
  AND (p1.tc_kimlik = p2.tc_kimlik OR p1.pasaport_no = p2.pasaport_no)
  AND p1.id != p2.min_id;

-- Add unique constraint for Turkish citizens (uyruk + tc_kimlik)
ALTER TABLE public.personel
ADD CONSTRAINT personel_uyruk_tc_kimlik_unique
UNIQUE (uyruk, tc_kimlik)
WHERE (uyruk = 'tc' AND tc_kimlik IS NOT NULL);

-- Add unique constraint for foreigners (uyruk + pasaport_no)
ALTER TABLE public.personel
ADD CONSTRAINT personel_uyruk_pasaport_unique
UNIQUE (uyruk, pasaport_no)
WHERE (uyruk = 'yabanci' AND pasaport_no IS NOT NULL);
