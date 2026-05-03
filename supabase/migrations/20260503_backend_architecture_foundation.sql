create extension if not exists "pgcrypto";

create table if not exists erp_instances (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists instance_modules (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references erp_instances(id) on delete cascade,
  module_code text not null,
  status text not null default 'enabled' check (status in ('enabled', 'disabled', 'readonly', 'beta')),
  enabled_at timestamptz,
  disabled_at timestamptz,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (instance_id, module_code)
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key text unique not null,
  module_code text not null,
  resource text not null,
  action text not null check (action in ('view', 'insert', 'edit', 'approve', 'passivate', 'export')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references erp_instances(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (instance_id, code)
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists user_roles (
  user_id uuid not null,
  instance_id uuid references erp_instances(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references erp_instances(id) on delete set null,
  user_id uuid,
  module_code text not null,
  resource text not null,
  record_id text,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists record_history (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references erp_instances(id) on delete set null,
  table_name text not null,
  record_id text not null,
  version integer not null,
  data_json jsonb not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references erp_instances(id) on delete cascade,
  module_code text not null,
  resource text not null,
  action text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'disabled')),
  name text not null,
  conditions_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_definition_id uuid not null references workflow_definitions(id) on delete cascade,
  step_order integer not null,
  approver_role_id uuid references roles(id) on delete set null,
  approver_permission text,
  settings_json jsonb not null default '{}'::jsonb,
  unique (workflow_definition_id, step_order)
);

create table if not exists workflow_requests (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references erp_instances(id) on delete cascade,
  workflow_definition_id uuid references workflow_definitions(id) on delete set null,
  module_code text not null,
  resource text not null,
  record_id text not null,
  requested_by uuid,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  before_json jsonb,
  requested_json jsonb not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists workflow_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_request_id uuid not null references workflow_requests(id) on delete cascade,
  actor_id uuid,
  action text not null check (action in ('submit', 'approve', 'reject', 'cancel')),
  comment text,
  created_at timestamptz not null default now()
);

alter table if exists sirketler
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists deleted_by uuid,
  add column if not exists version integer not null default 1,
  add column if not exists workflow_status text not null default 'none' check (workflow_status in ('none', 'pending', 'approved', 'rejected', 'cancelled')),
  add column if not exists pending_request_id uuid,
  add column if not exists approved_version integer,
  add column if not exists draft_version integer;

insert into permissions (permission_key, module_code, resource, action)
values
  ('companies.view', 'companies', 'companies', 'view'),
  ('companies.insert', 'companies', 'companies', 'insert'),
  ('companies.edit', 'companies', 'companies', 'edit'),
  ('companies.approve', 'companies', 'companies', 'approve'),
  ('companies.passivate', 'companies', 'companies', 'passivate'),
  ('companies.export', 'companies', 'companies', 'export'),
  ('employees.view', 'employees', 'employees', 'view'),
  ('employees.insert', 'employees', 'employees', 'insert'),
  ('employees.edit', 'employees', 'employees', 'edit'),
  ('vehicles.view', 'vehicles', 'vehicles', 'view'),
  ('vehicles.insert', 'vehicles', 'vehicles', 'insert'),
  ('vehicles.edit', 'vehicles', 'vehicles', 'edit'),
  ('workflow.view', 'workflow', 'workflow', 'view'),
  ('workflow.approve', 'workflow', 'workflow', 'approve'),
  ('documents.export', 'documents', 'documents', 'export')
on conflict (permission_key) do nothing;
