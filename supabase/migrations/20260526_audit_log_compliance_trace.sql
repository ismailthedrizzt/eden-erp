CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  instance_id uuid,
  company_id uuid NULL,
  branch_id uuid NULL,
  module_key text NULL,
  module_code text NULL,
  entity_type text NULL,
  entity_id text NULL,
  resource text,
  record_id text,
  action_type text,
  action text,
  action_key text NULL,
  operation_id uuid NULL,
  process_instance_id uuid NULL,
  task_id uuid NULL,
  approval_id uuid NULL,
  outbox_event_id uuid NULL,
  user_id uuid NULL,
  user_label text NULL,
  permission_key text NULL,
  policy_key text NULL,
  request_id text NULL,
  session_id text NULL,
  ip_address text NULL,
  user_agent text NULL,
  old_values jsonb NULL,
  new_values jsonb NULL,
  before_json jsonb NULL,
  after_json jsonb NULL,
  changed_fields text[] NOT NULL DEFAULT '{}'::text[],
  summary text NULL,
  reason text NULL,
  result_status text NOT NULL DEFAULT 'success',
  severity text NOT NULL DEFAULT 'info',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS tenant_id uuid,
  ADD COLUMN IF NOT EXISTS company_id uuid NULL,
  ADD COLUMN IF NOT EXISTS branch_id uuid NULL,
  ADD COLUMN IF NOT EXISTS module_key text NULL,
  ADD COLUMN IF NOT EXISTS entity_type text NULL,
  ADD COLUMN IF NOT EXISTS entity_id text NULL,
  ADD COLUMN IF NOT EXISTS action_type text,
  ADD COLUMN IF NOT EXISTS action_key text NULL,
  ADD COLUMN IF NOT EXISTS operation_id uuid NULL,
  ADD COLUMN IF NOT EXISTS process_instance_id uuid NULL,
  ADD COLUMN IF NOT EXISTS task_id uuid NULL,
  ADD COLUMN IF NOT EXISTS approval_id uuid NULL,
  ADD COLUMN IF NOT EXISTS outbox_event_id uuid NULL,
  ADD COLUMN IF NOT EXISTS user_label text NULL,
  ADD COLUMN IF NOT EXISTS permission_key text NULL,
  ADD COLUMN IF NOT EXISTS policy_key text NULL,
  ADD COLUMN IF NOT EXISTS request_id text NULL,
  ADD COLUMN IF NOT EXISTS session_id text NULL,
  ADD COLUMN IF NOT EXISTS ip_address text NULL,
  ADD COLUMN IF NOT EXISTS user_agent text NULL,
  ADD COLUMN IF NOT EXISTS old_values jsonb NULL,
  ADD COLUMN IF NOT EXISTS new_values jsonb NULL,
  ADD COLUMN IF NOT EXISTS changed_fields text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS summary text NULL,
  ADD COLUMN IF NOT EXISTS reason text NULL,
  ADD COLUMN IF NOT EXISTS result_status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info';

UPDATE public.audit_logs
SET
  tenant_id = COALESCE(tenant_id, instance_id, '00000000-0000-0000-0000-000000000000'::uuid),
  module_key = COALESCE(module_key, module_code),
  entity_type = COALESCE(entity_type, resource),
  entity_id = COALESCE(entity_id, record_id),
  action_type = COALESCE(action_type, action),
  old_values = COALESCE(old_values, before_json),
  new_values = COALESCE(new_values, after_json)
WHERE tenant_id IS NULL
   OR module_key IS NULL
   OR entity_type IS NULL
   OR entity_id IS NULL
   OR action_type IS NULL
   OR old_values IS NULL
   OR new_values IS NULL;

ALTER TABLE public.audit_logs
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN action_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx
  ON public.audit_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_company_created_idx
  ON public.audit_logs(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_branch_created_idx
  ON public.audit_logs(branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_record_created_idx
  ON public.audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_operation_idx
  ON public.audit_logs(operation_id);

CREATE INDEX IF NOT EXISTS audit_logs_process_idx
  ON public.audit_logs(process_instance_id);

CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx
  ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_action_type_idx
  ON public.audit_logs(action_type);

CREATE INDEX IF NOT EXISTS audit_logs_module_key_idx
  ON public.audit_logs(module_key);
