ALTER TABLE IF EXISTS public.outbox_events
  ADD COLUMN IF NOT EXISTS event_version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS process_instance_id uuid,
  ADD COLUMN IF NOT EXISTS causation_id text,
  ADD COLUMN IF NOT EXISTS correlation_id text,
  ADD COLUMN IF NOT EXISTS metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_retries integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE IF EXISTS public.outbox_events
  DROP CONSTRAINT IF EXISTS outbox_events_status_check;

ALTER TABLE IF EXISTS public.outbox_events
  ADD CONSTRAINT outbox_events_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'published', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS outbox_events_dispatch_v2_idx
  ON public.outbox_events(status, retry_count, locked_at, occurred_at, created_at);

CREATE INDEX IF NOT EXISTS outbox_events_tenant_event_idx
  ON public.outbox_events(tenant_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS outbox_events_correlation_idx
  ON public.outbox_events(correlation_id, causation_id)
  WHERE correlation_id IS NOT NULL OR causation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.outbox_event_handler_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  event_id uuid NOT NULL REFERENCES public.outbox_events(id) ON DELETE CASCADE,
  handler_key text NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed', 'skipped')),
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS outbox_event_handler_runs_event_handler_uidx
  ON public.outbox_event_handler_runs(event_id, handler_key);

CREATE INDEX IF NOT EXISTS outbox_event_handler_runs_tenant_status_idx
  ON public.outbox_event_handler_runs(tenant_id, status, started_at DESC);
