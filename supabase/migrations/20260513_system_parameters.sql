CREATE TABLE IF NOT EXISTS public.system_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key TEXT NOT NULL UNIQUE,
  module_key TEXT NOT NULL,
  page_key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_parameters_module_page
  ON public.system_parameters(module_key, page_key);
