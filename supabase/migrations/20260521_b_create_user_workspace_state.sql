CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.user_workspace_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.erp_instances(id) ON DELETE CASCADE,
  first_login_at timestamptz,
  last_login_at timestamptz,
  login_count integer NOT NULL DEFAULT 0,
  intro_started_at timestamptz,
  intro_completed_at timestamptz,
  intro_skipped_at timestamptz,
  intro_version text NOT NULL DEFAULT 'v1',
  intro_current_step text,
  ui_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS user_workspace_state_workspace_idx
  ON public.user_workspace_state(workspace_id);

CREATE INDEX IF NOT EXISTS user_workspace_state_user_idx
  ON public.user_workspace_state(user_id);

CREATE OR REPLACE FUNCTION public.set_user_workspace_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_workspace_state_updated_at_trigger
  ON public.user_workspace_state;

CREATE TRIGGER user_workspace_state_updated_at_trigger
BEFORE UPDATE ON public.user_workspace_state
FOR EACH ROW
EXECUTE FUNCTION public.set_user_workspace_state_updated_at();

CREATE OR REPLACE FUNCTION public.jsonb_deep_merge(target jsonb, patch jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN patch IS NULL THEN COALESCE(target, '{}'::jsonb)
    WHEN target IS NULL THEN patch
    WHEN jsonb_typeof(target) <> 'object' OR jsonb_typeof(patch) <> 'object' THEN patch
    ELSE COALESCE((
      SELECT jsonb_object_agg(merged.key, merged.value)
      FROM (
        SELECT
          COALESCE(target_item.key, patch_item.key) AS key,
          CASE
            WHEN target_item.value IS NULL THEN patch_item.value
            WHEN patch_item.value IS NULL THEN target_item.value
            WHEN jsonb_typeof(target_item.value) = 'object'
              AND jsonb_typeof(patch_item.value) = 'object'
              THEN public.jsonb_deep_merge(target_item.value, patch_item.value)
            ELSE patch_item.value
          END AS value
        FROM jsonb_each(target) AS target_item
        FULL JOIN jsonb_each(patch) AS patch_item USING (key)
      ) AS merged
    ), '{}'::jsonb)
  END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_user_workspace_state(
  p_user_id uuid,
  p_workspace_id uuid,
  p_intro_version text DEFAULT 'v1',
  p_ui_defaults jsonb DEFAULT '{}'::jsonb,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE(state jsonb, is_first_login boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_state public.user_workspace_state%ROWTYPE;
  v_existing public.user_workspace_state%ROWTYPE;
  v_is_first_login boolean := false;
BEGIN
  INSERT INTO public.user_workspace_state (
    user_id,
    workspace_id,
    first_login_at,
    last_login_at,
    login_count,
    intro_version,
    ui_preferences
  )
  VALUES (
    p_user_id,
    p_workspace_id,
    v_now,
    v_now,
    1,
    COALESCE(NULLIF(p_intro_version, ''), 'v1'),
    COALESCE(p_ui_defaults, '{}'::jsonb)
  )
  ON CONFLICT (user_id, workspace_id) DO NOTHING
  RETURNING * INTO v_state;

  IF FOUND THEN
    v_is_first_login := true;
  ELSE
    SELECT *
    INTO v_existing
    FROM public.user_workspace_state
    WHERE user_id = p_user_id
      AND workspace_id = p_workspace_id
    FOR UPDATE;

    v_is_first_login := v_existing.first_login_at IS NULL;

    UPDATE public.user_workspace_state
    SET
      first_login_at = COALESCE(first_login_at, v_now),
      last_login_at = v_now,
      login_count = COALESCE(login_count, 0) + 1,
      intro_version = COALESCE(NULLIF(intro_version, ''), COALESCE(NULLIF(p_intro_version, ''), 'v1')),
      ui_preferences = public.jsonb_deep_merge(COALESCE(p_ui_defaults, '{}'::jsonb), COALESCE(ui_preferences, '{}'::jsonb))
    WHERE user_id = p_user_id
      AND workspace_id = p_workspace_id
    RETURNING * INTO v_state;
  END IF;

  IF v_is_first_login THEN
    INSERT INTO public.system_event_logs (
      workspace_id,
      actor_user_id,
      event_type,
      event_time,
      metadata,
      ip_address,
      user_agent
    )
    VALUES (
      p_workspace_id,
      p_user_id,
      'USER_FIRST_LOGIN',
      v_now,
      jsonb_build_object('intro_version', COALESCE(NULLIF(p_intro_version, ''), 'v1')),
      p_ip_address,
      p_user_agent
    )
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.system_event_logs (
    workspace_id,
    actor_user_id,
    event_type,
    event_time,
    metadata,
    ip_address,
    user_agent
  )
  VALUES (
    p_workspace_id,
    p_user_id,
    'USER_LOGIN',
    v_now,
    jsonb_build_object('login_count', v_state.login_count, 'intro_version', v_state.intro_version),
    p_ip_address,
    p_user_agent
  );

  RETURN QUERY SELECT to_jsonb(v_state), v_is_first_login;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_user_workspace_ui_preferences(
  p_user_id uuid,
  p_workspace_id uuid,
  p_patch jsonb,
  p_ui_defaults jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state public.user_workspace_state%ROWTYPE;
BEGIN
  INSERT INTO public.user_workspace_state (
    user_id,
    workspace_id,
    intro_version,
    ui_preferences
  )
  VALUES (
    p_user_id,
    p_workspace_id,
    'v1',
    public.jsonb_deep_merge(COALESCE(p_ui_defaults, '{}'::jsonb), COALESCE(p_patch, '{}'::jsonb))
  )
  ON CONFLICT (user_id, workspace_id) DO UPDATE
  SET
    ui_preferences = public.jsonb_deep_merge(
      public.jsonb_deep_merge(COALESCE(p_ui_defaults, '{}'::jsonb), COALESCE(public.user_workspace_state.ui_preferences, '{}'::jsonb)),
      COALESCE(p_patch, '{}'::jsonb)
    )
  RETURNING * INTO v_state;

  RETURN to_jsonb(v_state);
END;
$$;
