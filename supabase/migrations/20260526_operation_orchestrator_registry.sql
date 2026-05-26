ALTER TABLE IF EXISTS public.outbox_events
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by text;

ALTER TABLE IF EXISTS public.outbox_events
  DROP CONSTRAINT IF EXISTS outbox_events_status_check;

ALTER TABLE IF EXISTS public.outbox_events
  ADD CONSTRAINT outbox_events_status_check
  CHECK (status IN ('pending', 'processing', 'completed', 'published', 'failed'));

CREATE INDEX IF NOT EXISTS outbox_events_dispatch_idx
  ON public.outbox_events(status, locked_at, created_at);

ALTER TABLE IF EXISTS public.company_representative_authority_transactions
  ADD COLUMN IF NOT EXISTS scope_type text,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.company_branches(id),
  ADD COLUMN IF NOT EXISTS organization_unit_id uuid REFERENCES public.organization_units(id),
  ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.company_facilities(id),
  ADD COLUMN IF NOT EXISTS scope_label text,
  ADD COLUMN IF NOT EXISTS scope_notes text;

CREATE INDEX IF NOT EXISTS company_representative_authority_scope_idx
  ON public.company_representative_authority_transactions(scope_type, branch_id, organization_unit_id, facility_id)
  WHERE is_deleted = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'perform_company_branch_opening'
      AND pg_get_function_identity_arguments(oid) = 'payload jsonb'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.perform_company_branch_opening(payload jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        RETURN jsonb_build_object(
          'ok', false,
          'code', 'RPC_NOT_IMPLEMENTED',
          'message', 'Application orchestrator fallback should handle company branch opening until RPC transaction is implemented.'
        );
      END;
      $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'perform_company_branch_closing'
      AND pg_get_function_identity_arguments(oid) = 'payload jsonb'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.perform_company_branch_closing(payload jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        RETURN jsonb_build_object(
          'ok', false,
          'code', 'RPC_NOT_IMPLEMENTED',
          'message', 'Application orchestrator fallback should handle company branch closing until RPC transaction is implemented.'
        );
      END;
      $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'perform_capital_increase'
      AND pg_get_function_identity_arguments(oid) = 'payload jsonb'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.perform_capital_increase(payload jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        RETURN jsonb_build_object('ok', false, 'code', 'RPC_NOT_IMPLEMENTED');
      END;
      $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'perform_representative_authority_transaction'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.perform_representative_authority_transaction(payload jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        RETURN jsonb_build_object('ok', false, 'code', 'RPC_NOT_IMPLEMENTED');
      END;
      $body$;
    $fn$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'perform_ownership_transaction'
      AND pg_get_function_identity_arguments(oid) = 'payload jsonb'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION public.perform_ownership_transaction(payload jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        RETURN jsonb_build_object('ok', false, 'code', 'RPC_NOT_IMPLEMENTED');
      END;
      $body$;
    $fn$;
  END IF;
END $$;
