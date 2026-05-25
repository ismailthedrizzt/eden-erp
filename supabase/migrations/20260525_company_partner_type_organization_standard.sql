UPDATE public.company_partners
SET partner_type = 'organization'
WHERE partner_type IN ('company', 'sirket', 'şirket', 'tuzel_kisi', 'tüzel_kisi');

UPDATE public.company_partners
SET partner_type = 'person'
WHERE partner_type IN ('kisi', 'kişi', 'gercek_kisi', 'gerçek_kisi');

UPDATE public.company_partners
SET owner_kind = 'organization'
WHERE owner_kind IN ('company', 'sirket', 'şirket', 'tuzel_kisi', 'tüzel_kisi');

UPDATE public.company_partners
SET owner_kind = 'person'
WHERE owner_kind IN ('kisi', 'kişi', 'gercek_kisi', 'gerçek_kisi');
