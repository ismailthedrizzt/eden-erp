INSERT INTO public.organization_unit_types (name, slug, color, icon, sort_order, is_active)
VALUES ('Şirket', 'sirket', '#0f766e', 'Building2', 0, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

UPDATE public.birimler
SET unit_type_id = (SELECT id FROM public.organization_unit_types WHERE slug = 'sirket' LIMIT 1)
WHERE tip = 'sirket'
  AND unit_type_id IS NULL;

INSERT INTO public.birimler (
  id,
  sirket_id,
  ust_birim_id,
  ad,
  name,
  short_name,
  tip,
  unit_type_id,
  status,
  aktif,
  is_deleted
)
SELECT
  gen_random_uuid(),
  s.id,
  NULL,
  COALESCE(NULLIF(s.ticari_unvan, ''), NULLIF(s.kisa_unvan, ''), 'Şirket'),
  COALESCE(NULLIF(s.ticari_unvan, ''), NULLIF(s.kisa_unvan, ''), 'Şirket'),
  NULLIF(s.kisa_unvan, ''),
  'sirket',
  (SELECT id FROM public.organization_unit_types WHERE slug = 'sirket' LIMIT 1),
  'Aktif',
  true,
  false
FROM public.sirketler s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.birimler b
  WHERE b.sirket_id = s.id
    AND b.ust_birim_id IS NULL
    AND b.tip = 'sirket'
    AND COALESCE(b.is_deleted, false) = false
);

UPDATE public.birimler child
SET ust_birim_id = root.id
FROM public.birimler root
WHERE child.sirket_id = root.sirket_id
  AND child.id <> root.id
  AND child.ust_birim_id IS NULL
  AND child.tip <> 'sirket'
  AND root.ust_birim_id IS NULL
  AND root.tip = 'sirket'
  AND COALESCE(child.is_deleted, false) = false
  AND COALESCE(root.is_deleted, false) = false;
