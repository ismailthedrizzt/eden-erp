CREATE OR REPLACE FUNCTION public.normalize_country_nationality_code(input_value text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw text := btrim(coalesce(input_value, ''));
  val text := lower(btrim(coalesce(input_value, '')));
BEGIN
  IF raw = '' THEN
    RETURN NULL;
  END IF;

  IF length(raw) IN (2, 4) AND raw = upper(raw) THEN
    RETURN raw;
  END IF;

  IF val IN ('tr', 'tc', 't.c.', 't.c', 'turkiye', 'türkiye', 'türk', 'turk', 'türkiye cumhuriyeti', 'turkiye cumhuriyeti')
    OR val LIKE '+90%tür%'
    OR val LIKE '+90%turk%'
    OR val LIKE '%türkiye%türk%'
    OR val LIKE '%turkiye%turk%' THEN
    RETURN 'TR';
  END IF;

  IF val IN ('trnc', 'kktc', 'kuzey kıbrıs türk cumhuriyeti', 'kuzey kibris turk cumhuriyeti', 'kıbrıs türkü', 'kibris turku') THEN
    RETURN 'TRNC';
  END IF;

  IF val IN ('xk', 'kosova', 'kosovalı', 'kosovali') THEN RETURN 'XK'; END IF;
  IF val IN ('de', 'almanya', 'alman', 'germany', 'german') THEN RETURN 'DE'; END IF;
  IF val IN ('fr', 'fransa', 'fransız', 'fransiz', 'france', 'french') THEN RETURN 'FR'; END IF;
  IF val IN ('gb', 'uk', 'ingiltere', 'birleşik krallık', 'birlesik krallik', 'ingiliz', 'united kingdom', 'british') THEN RETURN 'GB'; END IF;
  IF val IN ('us', 'usa', 'abd', 'amerika', 'amerikalı', 'amerikali', 'united states', 'american') THEN RETURN 'US'; END IF;
  IF val IN ('it', 'italya', 'italyan', 'italy', 'italian') THEN RETURN 'IT'; END IF;
  IF val IN ('es', 'ispanya', 'ispanyol', 'spain', 'spanish') THEN RETURN 'ES'; END IF;
  IF val IN ('gr', 'yunanistan', 'yunan', 'greece', 'greek') THEN RETURN 'GR'; END IF;
  IF val IN ('bg', 'bulgaristan', 'bulgar', 'bulgaria') THEN RETURN 'BG'; END IF;
  IF val IN ('ro', 'romanya', 'rumen', 'romania') THEN RETURN 'RO'; END IF;
  IF val IN ('ru', 'rusya', 'rus', 'russia', 'russian') THEN RETURN 'RU'; END IF;
  IF val IN ('ua', 'ukrayna', 'ukraynalı', 'ukraynali', 'ukraine', 'ukrainian') THEN RETURN 'UA'; END IF;
  IF val IN ('cn', 'çin', 'cin', 'çinli', 'cinli', 'china', 'chinese') THEN RETURN 'CN'; END IF;
  IF val IN ('jp', 'japonya', 'japon', 'japan', 'japanese') THEN RETURN 'JP'; END IF;
  IF val IN ('kr', 'güney kore', 'guney kore', 'güney koreli', 'guney koreli', 'south korea', 'korean') THEN RETURN 'KR'; END IF;
  IF val IN ('az', 'azerbaycan', 'azerbaycanlı', 'azerbaycanli', 'azerbaijan') THEN RETURN 'AZ'; END IF;
  IF val IN ('nl', 'hollanda', 'hollandalı', 'hollandali', 'netherlands', 'dutch') THEN RETURN 'NL'; END IF;
  IF val IN ('be', 'belçika', 'belcika', 'belçikalı', 'belcikali', 'belgium') THEN RETURN 'BE'; END IF;
  IF val IN ('at', 'avusturya', 'avusturyalı', 'avusturyali', 'austria') THEN RETURN 'AT'; END IF;
  IF val IN ('ch', 'isviçre', 'isvicre', 'isviçreli', 'isvicreli', 'switzerland') THEN RETURN 'CH'; END IF;
  IF val IN ('se', 'isveç', 'isvec', 'isveçli', 'isvecli', 'sweden') THEN RETURN 'SE'; END IF;
  IF val IN ('no', 'norveç', 'norvec', 'norveçli', 'norvecli', 'norway') THEN RETURN 'NO'; END IF;
  IF val IN ('dk', 'danimarka', 'danimarkalı', 'danimarkali', 'denmark') THEN RETURN 'DK'; END IF;
  IF val IN ('fi', 'finlandiya', 'fin', 'finland') THEN RETURN 'FI'; END IF;
  IF val IN ('pl', 'polonya', 'polonyalı', 'polonyali', 'poland') THEN RETURN 'PL'; END IF;

  RETURN upper(raw);
END;
$$;

UPDATE public.persons
SET nationality = public.normalize_country_nationality_code(nationality)
WHERE nationality IS NOT NULL
  AND public.normalize_country_nationality_code(nationality) IS NOT NULL
  AND nationality IS DISTINCT FROM public.normalize_country_nationality_code(nationality);

UPDATE public.organizations
SET country = public.normalize_country_nationality_code(country)
WHERE country IS NOT NULL
  AND public.normalize_country_nationality_code(country) IS NOT NULL
  AND country IS DISTINCT FROM public.normalize_country_nationality_code(country);

DO $$
BEGIN
  IF to_regclass('public.employees') IS NOT NULL THEN
    UPDATE public.employees
    SET uyruk = public.normalize_country_nationality_code(uyruk)
    WHERE uyruk IS NOT NULL
      AND public.normalize_country_nationality_code(uyruk) IS NOT NULL
      AND uyruk IS DISTINCT FROM public.normalize_country_nationality_code(uyruk);
  END IF;

  IF to_regclass('public.sirket_temsilciler') IS NOT NULL THEN
    UPDATE public.sirket_temsilciler
    SET representative_profile = jsonb_set(
      representative_profile,
      '{nationality}',
      to_jsonb(public.normalize_country_nationality_code(representative_profile->>'nationality')),
      true
    )
    WHERE representative_profile ? 'nationality'
      AND public.normalize_country_nationality_code(representative_profile->>'nationality') IS NOT NULL
      AND representative_profile->>'nationality' IS DISTINCT FROM public.normalize_country_nationality_code(representative_profile->>'nationality');

    UPDATE public.sirket_temsilciler
    SET representative_profile = jsonb_set(
      representative_profile,
      '{country}',
      to_jsonb(public.normalize_country_nationality_code(representative_profile->>'country')),
      true
    )
    WHERE representative_profile ? 'country'
      AND public.normalize_country_nationality_code(representative_profile->>'country') IS NOT NULL
      AND representative_profile->>'country' IS DISTINCT FROM public.normalize_country_nationality_code(representative_profile->>'country');

    UPDATE public.sirket_temsilciler
    SET representative_profile = jsonb_set(
      representative_profile,
      '{nationality_country}',
      to_jsonb(public.normalize_country_nationality_code(representative_profile->>'nationality_country')),
      true
    )
    WHERE representative_profile ? 'nationality_country'
      AND public.normalize_country_nationality_code(representative_profile->>'nationality_country') IS NOT NULL
      AND representative_profile->>'nationality_country' IS DISTINCT FROM public.normalize_country_nationality_code(representative_profile->>'nationality_country');
  END IF;

  IF to_regclass('public.sirket_ortaklar') IS NOT NULL THEN
    UPDATE public.sirket_ortaklar
    SET partner_profile = jsonb_set(partner_profile, '{uyruk}', to_jsonb(public.normalize_country_nationality_code(partner_profile->>'uyruk')), true)
    WHERE partner_profile ? 'uyruk'
      AND public.normalize_country_nationality_code(partner_profile->>'uyruk') IS NOT NULL
      AND partner_profile->>'uyruk' IS DISTINCT FROM public.normalize_country_nationality_code(partner_profile->>'uyruk');

    UPDATE public.sirket_ortaklar
    SET partner_profile = jsonb_set(partner_profile, '{nationality}', to_jsonb(public.normalize_country_nationality_code(partner_profile->>'nationality')), true)
    WHERE partner_profile ? 'nationality'
      AND public.normalize_country_nationality_code(partner_profile->>'nationality') IS NOT NULL
      AND partner_profile->>'nationality' IS DISTINCT FROM public.normalize_country_nationality_code(partner_profile->>'nationality');

    UPDATE public.sirket_ortaklar
    SET partner_profile = jsonb_set(partner_profile, '{country}', to_jsonb(public.normalize_country_nationality_code(partner_profile->>'country')), true)
    WHERE partner_profile ? 'country'
      AND public.normalize_country_nationality_code(partner_profile->>'country') IS NOT NULL
      AND partner_profile->>'country' IS DISTINCT FROM public.normalize_country_nationality_code(partner_profile->>'country');

    UPDATE public.sirket_ortaklar
    SET partner_profile = jsonb_set(partner_profile, '{nationality_country}', to_jsonb(public.normalize_country_nationality_code(partner_profile->>'nationality_country')), true)
    WHERE partner_profile ? 'nationality_country'
      AND public.normalize_country_nationality_code(partner_profile->>'nationality_country') IS NOT NULL
      AND partner_profile->>'nationality_country' IS DISTINCT FROM public.normalize_country_nationality_code(partner_profile->>'nationality_country');
  END IF;

  IF to_regclass('public.stakeholders') IS NOT NULL THEN
    UPDATE public.stakeholders
    SET country = public.normalize_country_nationality_code(country)
    WHERE country IS NOT NULL
      AND public.normalize_country_nationality_code(country) IS NOT NULL
      AND country IS DISTINCT FROM public.normalize_country_nationality_code(country);

    UPDATE public.stakeholders
    SET stakeholder_profile = jsonb_set(stakeholder_profile, '{country}', to_jsonb(public.normalize_country_nationality_code(stakeholder_profile->>'country')), true)
    WHERE stakeholder_profile ? 'country'
      AND public.normalize_country_nationality_code(stakeholder_profile->>'country') IS NOT NULL
      AND stakeholder_profile->>'country' IS DISTINCT FROM public.normalize_country_nationality_code(stakeholder_profile->>'country');
  END IF;
END $$;
