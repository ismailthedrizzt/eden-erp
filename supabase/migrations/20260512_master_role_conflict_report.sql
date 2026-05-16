CREATE TABLE IF NOT EXISTS public.master_role_identity_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_table text NOT NULL,
  role_id uuid NOT NULL,
  master_table text NOT NULL,
  master_id uuid NOT NULL,
  field_name text NOT NULL,
  master_value text,
  role_value text,
  suggested_value text,
  suggestion_reason text,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_table, role_id, master_table, master_id, field_name)
);

WITH employee_conflicts AS (
  SELECT
    'employees'::text AS role_table,
    e.id AS role_id,
    'persons'::text AS master_table,
    p.id AS master_id,
    item.field_name,
    item.master_value,
    item.role_value,
    CASE
      WHEN e.updated_at > p.updated_at THEN item.role_value
      ELSE item.master_value
    END AS suggested_value,
    CASE
      WHEN e.updated_at > p.updated_at THEN 'role_updated_later'
      ELSE 'master_updated_later_or_equal'
    END AS suggestion_reason
  FROM public.employees e
  JOIN public.persons p ON p.id = e.person_id
  CROSS JOIN LATERAL (
    VALUES
      ('first_name', p.first_name, e.ad),
      ('last_name', p.last_name, e.soyad),
      ('national_id', p.national_id, e.tc_kimlik),
      ('passport_no', p.passport_no, e.pasaport_no),
      ('birth_date', p.birth_date::text, e.dogum_tarihi::text),
      ('phone', p.phone, e.cep_telefonu),
      ('email', p.email, e.email),
      ('address', p.address, e.adres),
      ('city', p.city, e.il),
      ('district', p.district, e.ilce)
  ) AS item(field_name, master_value, role_value)
  WHERE COALESCE(p.is_deleted, false) = false
    AND COALESCE(e.is_deleted, false) = false
    AND NULLIF(BTRIM(COALESCE(item.master_value, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(item.role_value, '')), '') IS NOT NULL
    AND BTRIM(COALESCE(item.master_value, '')) IS DISTINCT FROM BTRIM(COALESCE(item.role_value, ''))
),
company_conflicts AS (
  SELECT
    'sirketler'::text AS role_table,
    s.id AS role_id,
    'organizations'::text AS master_table,
    o.id AS master_id,
    item.field_name,
    item.master_value,
    item.role_value,
    CASE
      WHEN s.updated_at > o.updated_at THEN item.role_value
      ELSE item.master_value
    END AS suggested_value,
    CASE
      WHEN s.updated_at > o.updated_at THEN 'role_updated_later'
      ELSE 'master_updated_later_or_equal'
    END AS suggestion_reason
  FROM public.sirketler s
  JOIN public.organizations o ON o.id = s.organization_id
  CROSS JOIN LATERAL (
    VALUES
      ('legal_name', o.legal_name, s.ticari_unvan),
      ('short_name', o.short_name, s.kisa_unvan),
      ('tax_number', o.tax_number, s.vkn_tckn),
      ('registration_number', o.registration_number, COALESCE(s.ticaret_sicil_no, s.mersis_no)),
      ('tax_office', o.tax_office, s.vergi_dairesi),
      ('organization_type', o.organization_type, s.sirket_turu),
      ('phone', o.phone, s.telefon),
      ('email', o.email, s.email),
      ('address', o.address, s.adres),
      ('city', o.city, s.il),
      ('district', o.district, s.ilce)
  ) AS item(field_name, master_value, role_value)
  WHERE COALESCE(o.is_deleted, false) = false
    AND COALESCE(s.is_deleted, false) = false
    AND NULLIF(BTRIM(COALESCE(item.master_value, '')), '') IS NOT NULL
    AND NULLIF(BTRIM(COALESCE(item.role_value, '')), '') IS NOT NULL
    AND BTRIM(COALESCE(item.master_value, '')) IS DISTINCT FROM BTRIM(COALESCE(item.role_value, ''))
)
INSERT INTO public.master_role_identity_conflicts (
  role_table,
  role_id,
  master_table,
  master_id,
  field_name,
  master_value,
  role_value,
  suggested_value,
  suggestion_reason
)
SELECT
  role_table,
  role_id,
  master_table,
  master_id,
  field_name,
  master_value,
  role_value,
  suggested_value,
  suggestion_reason
FROM (
  SELECT * FROM employee_conflicts
  UNION ALL
  SELECT * FROM company_conflicts
) conflicts
ON CONFLICT (role_table, role_id, master_table, master_id, field_name)
DO UPDATE SET
  master_value = EXCLUDED.master_value,
  role_value = EXCLUDED.role_value,
  suggested_value = EXCLUDED.suggested_value,
  suggestion_reason = EXCLUDED.suggestion_reason,
  created_at = public.master_role_identity_conflicts.created_at
WHERE public.master_role_identity_conflicts.resolved_at IS NULL;

CREATE OR REPLACE VIEW public.v_master_role_identity_conflicts_open AS
SELECT *
FROM public.master_role_identity_conflicts
WHERE resolved_at IS NULL
ORDER BY created_at DESC, role_table, role_id, field_name;
