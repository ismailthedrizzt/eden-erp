CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.system_event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.erp_instances(id) ON DELETE SET NULL,
  actor_user_id uuid,
  event_type text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'system_event_logs_event_type_check'
  ) THEN
    ALTER TABLE public.system_event_logs
      ADD CONSTRAINT system_event_logs_event_type_check
      CHECK (event_type IN (
        'USER_FIRST_LOGIN',
        'USER_LOGIN',
        'SYSTEM_TOUR_STARTED',
        'SYSTEM_TOUR_STEP_VIEWED',
        'SYSTEM_TOUR_COMPLETED',
        'SYSTEM_TOUR_SKIPPED',
        'SYSTEM_TOUR_POSTPONED',
        'SYSTEM_TOUR_REOPENED',
        'USER_UI_PREFERENCES_UPDATED'
      ));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS system_event_logs_workspace_time_idx
  ON public.system_event_logs(workspace_id, event_time DESC);

CREATE INDEX IF NOT EXISTS system_event_logs_actor_time_idx
  ON public.system_event_logs(actor_user_id, event_time DESC);

CREATE INDEX IF NOT EXISTS system_event_logs_event_type_time_idx
  ON public.system_event_logs(event_type, event_time DESC);

CREATE UNIQUE INDEX IF NOT EXISTS system_event_logs_first_login_once_uidx
  ON public.system_event_logs(workspace_id, actor_user_id, event_type)
  WHERE event_type = 'USER_FIRST_LOGIN'
    AND workspace_id IS NOT NULL
    AND actor_user_id IS NOT NULL;
