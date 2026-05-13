-- Supabase Security Advisor hardening.
-- SECURITY INVOKER makes views use the querying user's permissions/RLS.
ALTER VIEW IF EXISTS public.v_current_ownership SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_master_role_identity_conflicts_open SET (security_invoker = true);

-- Public schema tables exposed to PostgREST must have RLS enabled.
ALTER TABLE IF EXISTS public.position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reference_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_public_tax ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_public_sgk ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_public_incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_public_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_public_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_public_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_unit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.position_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.instance_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.record_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.identity_duplicate_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.identity_merge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ownership_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.master_role_identity_conflicts ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
