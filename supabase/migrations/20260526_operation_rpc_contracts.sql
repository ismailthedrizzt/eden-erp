CREATE OR REPLACE FUNCTION public.perform_company_branch_opening(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'ok', false,
    'code', 'RPC_NOT_IMPLEMENTED',
    'error', 'Bu islem su anda application fallback uzerinden calismaktadir.',
    'details', jsonb_build_object('contract', 'company_branch_opening', 'payload_version', COALESCE(payload->>'payload_version', '1.0'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.perform_company_branch_closing(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'ok', false,
    'code', 'RPC_NOT_IMPLEMENTED',
    'error', 'Bu islem su anda application fallback uzerinden calismaktadir.',
    'details', jsonb_build_object('contract', 'company_branch_closing', 'payload_version', COALESCE(payload->>'payload_version', '1.0'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.perform_capital_increase(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'ok', false,
    'code', 'RPC_NOT_IMPLEMENTED',
    'error', 'Bu islem su anda application fallback uzerinden calismaktadir.',
    'details', jsonb_build_object('contract', 'capital_increase', 'payload_version', COALESCE(payload->>'payload_version', '1.0'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.perform_representative_authority_transaction(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'ok', false,
    'code', 'RPC_NOT_IMPLEMENTED',
    'error', 'Bu islem su anda application fallback uzerinden calismaktadir.',
    'details', jsonb_build_object('contract', 'representative_authority_transaction', 'payload_version', COALESCE(payload->>'payload_version', '1.0'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.perform_ownership_transaction(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'ok', false,
    'code', 'RPC_NOT_IMPLEMENTED',
    'error', 'Bu islem su anda application fallback uzerinden calismaktadir.',
    'details', jsonb_build_object('contract', 'ownership_transaction', 'payload_version', COALESCE(payload->>'payload_version', '1.0'))
  );
END;
$$;
