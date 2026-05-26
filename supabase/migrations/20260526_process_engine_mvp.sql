CREATE TABLE IF NOT EXISTS public.process_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  module_key text NOT NULL,
  process_key text NOT NULL,
  process_version text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  operation_key text,
  operation_id uuid REFERENCES public.operation_requests(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'waiting_approval', 'completed', 'cancelled', 'failed')),
  current_step_key text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_by uuid,
  completed_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS process_instances_tenant_status_idx
  ON public.process_instances(tenant_id, status, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS process_instances_entity_idx
  ON public.process_instances(entity_type, entity_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS process_instances_operation_idx
  ON public.process_instances(operation_key, operation_id)
  WHERE is_deleted = false;

CREATE TABLE IF NOT EXISTS public.process_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id),
  process_instance_id uuid NOT NULL REFERENCES public.process_instances(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id),
  module_key text NOT NULL,
  entity_type text,
  entity_id uuid,
  step_key text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'overdue')),
  assigned_to uuid,
  assigned_role text,
  assigned_permission text,
  due_at timestamptz,
  completed_by uuid,
  completed_at timestamptz,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS process_tasks_tenant_status_idx
  ON public.process_tasks(tenant_id, status, due_at, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS process_tasks_process_idx
  ON public.process_tasks(process_instance_id, step_key, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS process_tasks_assignee_idx
  ON public.process_tasks(tenant_id, assigned_to, status)
  WHERE is_deleted = false;

CREATE TABLE IF NOT EXISTS public.process_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id),
  process_instance_id uuid NOT NULL REFERENCES public.process_instances(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.process_tasks(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id),
  module_key text NOT NULL,
  approval_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid,
  approver_id uuid,
  approver_role text,
  approver_permission text,
  decision_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS process_approvals_tenant_status_idx
  ON public.process_approvals(tenant_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS process_approvals_process_idx
  ON public.process_approvals(process_instance_id, status);

CREATE TABLE IF NOT EXISTS public.process_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.erp_instances(id),
  process_instance_id uuid NOT NULL REFERENCES public.process_instances(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id),
  module_key text NOT NULL,
  event_type text NOT NULL,
  step_key text,
  old_status text,
  new_status text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS process_events_process_created_idx
  ON public.process_events(process_instance_id, created_at DESC);

CREATE INDEX IF NOT EXISTS process_events_tenant_event_idx
  ON public.process_events(tenant_id, event_type, created_at DESC);

ALTER TABLE public.process_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_events ENABLE ROW LEVEL SECURITY;
