-- Gorev ve Proje Yonetimi module.
-- JIRA'dan ilham alir; Eden ERP kayitlariyla iliskili is takip merkezi olarak tasarlanmistir.

ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS module_name text;
ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.module_licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'all';

ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS submodule_name text;
ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.submodule_licenses ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'all';

CREATE TABLE IF NOT EXISTS public.project_management_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  customer_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  project_type text NOT NULL DEFAULT 'sirket_ici' CHECK (project_type IN (
    'sirket_ici',
    'musteri_projesi',
    'urun_gelistirme',
    'satis_projesi',
    'satis_sonrasi_hizmet',
    'yazilim_gelistirme',
    'kurulum',
    'bakim',
    'kosgeb_tesvik',
    'danismanlik',
    'ihale_teklif',
    'diger'
  )),
  project_manager_id uuid REFERENCES public.employees(id),
  status text NOT NULL DEFAULT 'taslak' CHECK (status IN (
    'taslak',
    'planlandi',
    'devam_ediyor',
    'riskli',
    'beklemede',
    'tamamlandi',
    'iptal_edildi',
    'arsivlendi'
  )),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('dusuk', 'normal', 'yuksek', 'kritik', 'acil')),
  start_date date,
  target_end_date date,
  actual_end_date date,
  budget numeric(18, 2),
  currency text,
  estimated_hours numeric(12, 2),
  spent_hours numeric(12, 2),
  completion_rate numeric(5, 2) NOT NULL DEFAULT 0,
  goals text,
  scope text,
  risks text,
  notes text,
  attachments_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  team_member_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_status text NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'passive')),
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_projects_tenant_code
  ON public.project_management_projects(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_projects_company_status
  ON public.project_management_projects(company_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_projects_customer
  ON public.project_management_projects(customer_id)
  WHERE customer_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_projects_manager
  ON public.project_management_projects(project_manager_id)
  WHERE project_manager_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  applicable_project_type text,
  initial_status text NOT NULL DEFAULT 'yeni',
  closing_status text NOT NULL DEFAULT 'tamamlandi',
  is_active boolean NOT NULL DEFAULT true,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_status text NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'passive')),
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pm_workflows_company_active
  ON public.project_management_workflows(company_id, is_active)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_workflow_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.project_management_workflows(id) ON DELETE CASCADE,
  status_key text NOT NULL,
  name text NOT NULL,
  status_order integer NOT NULL DEFAULT 0,
  color text,
  is_initial boolean NOT NULL DEFAULT false,
  is_closing boolean NOT NULL DEFAULT false,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_workflow_statuses_key
  ON public.project_management_workflow_statuses(workflow_id, status_key);

CREATE TABLE IF NOT EXISTS public.project_management_workflow_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.project_management_workflows(id) ON DELETE CASCADE,
  source_status text NOT NULL,
  target_status text NOT NULL,
  allowed_permission_key text,
  allowed_roles_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  description_required boolean NOT NULL DEFAULT false,
  attachment_required boolean NOT NULL DEFAULT false,
  approval_required boolean NOT NULL DEFAULT false,
  closing_note_required boolean NOT NULL DEFAULT false,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_workflow_transitions_workflow
  ON public.project_management_workflow_transitions(workflow_id, source_status, target_status);

CREATE TABLE IF NOT EXISTS public.project_management_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  project_id uuid REFERENCES public.project_management_projects(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES public.project_management_workflows(id),
  name text NOT NULL,
  description text,
  columns_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pm_boards_project
  ON public.project_management_boards(project_id)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  project_id uuid REFERENCES public.project_management_projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  goal text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planlandi' CHECK (status IN ('planlandi', 'aktif', 'tamamlandi', 'iptal_edildi')),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_status text NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'passive')),
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pm_sprints_project_status
  ON public.project_management_sprints(project_id, status)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  project_id uuid REFERENCES public.project_management_projects(id) ON DELETE SET NULL,
  parent_task_id uuid REFERENCES public.project_management_tasks(id) ON DELETE SET NULL,
  task_no text NOT NULL,
  title text NOT NULL,
  description text,
  task_type text NOT NULL DEFAULT 'gorev' CHECK (task_type IN (
    'gorev',
    'alt_gorev',
    'is_paketi',
    'hata_problem',
    'talep',
    'servis_gorevi',
    'satis_takip_gorevi',
    'dokuman_takip_gorevi',
    'onay_gorevi',
    'toplanti_aksiyonu',
    'risk',
    'karar',
    'hatirlatma'
  )),
  status text NOT NULL DEFAULT 'yeni' CHECK (status IN (
    'yeni',
    'yapilacak',
    'devam_ediyor',
    'beklemede',
    'incelemede',
    'tamamlandi',
    'iptal_edildi'
  )),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('dusuk', 'normal', 'yuksek', 'kritik', 'acil')),
  assignee_id uuid REFERENCES public.employees(id),
  reporter_id uuid REFERENCES public.employees(id),
  helper_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  customer_id uuid,
  related_entity_type text,
  related_entity_id uuid,
  related_entity_label text,
  start_date date,
  end_date date,
  due_date date,
  completed_at timestamptz,
  estimated_hours numeric(12, 2),
  spent_hours numeric(12, 2),
  sprint_id uuid REFERENCES public.project_management_sprints(id) ON DELETE SET NULL,
  backlog_order integer,
  board_order integer,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  internal_notes text,
  customer_visible_notes text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_status text NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'passive')),
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_tasks_tenant_no
  ON public.project_management_tasks(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), task_no)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_tasks_company_status
  ON public.project_management_tasks(company_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_tasks_project_status
  ON public.project_management_tasks(project_id, status)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_tasks_assignee
  ON public.project_management_tasks(assignee_id, status)
  WHERE assignee_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_tasks_sprint
  ON public.project_management_tasks(sprint_id, board_order)
  WHERE sprint_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_tasks_backlog
  ON public.project_management_tasks(company_id, backlog_order)
  WHERE sprint_id IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_tasks_due_date
  ON public.project_management_tasks(due_date)
  WHERE due_date IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_tasks_related_entity
  ON public.project_management_tasks(related_entity_type, related_entity_id)
  WHERE related_entity_type IS NOT NULL AND related_entity_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  color text,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_labels_company_name
  ON public.project_management_labels(COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_management_tasks(id) ON DELETE CASCADE,
  user_id uuid,
  comment text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pm_task_comments_task
  ON public.project_management_task_comments(task_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_management_tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pm_task_attachments_task
  ON public.project_management_task_attachments(task_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id uuid NOT NULL REFERENCES public.project_management_tasks(id) ON DELETE CASCADE,
  target_task_id uuid NOT NULL REFERENCES public.project_management_tasks(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN (
    'blocked_by',
    'blocks',
    'related',
    'duplicate',
    'subtask',
    'parent',
    'same_customer_work',
    'same_service_process',
    'same_sales_process'
  )),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_management_task_links_not_self CHECK (source_task_id <> target_task_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_task_links_unique
  ON public.project_management_task_links(source_task_id, target_task_id, link_type);

CREATE INDEX IF NOT EXISTS idx_pm_task_links_target
  ON public.project_management_task_links(target_task_id);

CREATE TABLE IF NOT EXISTS public.project_management_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.erp_instances(id),
  company_id uuid REFERENCES public.companies(id),
  task_id uuid NOT NULL REFERENCES public.project_management_tasks(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.project_management_projects(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.employees(id),
  work_date date NOT NULL,
  start_time time,
  end_time time,
  duration_minutes integer NOT NULL CHECK (duration_minutes >= 0),
  description text,
  is_billable boolean NOT NULL DEFAULT false,
  is_customer_visible boolean NOT NULL DEFAULT false,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_status text NOT NULL DEFAULT 'active' CHECK (record_status IN ('active', 'passive')),
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pm_time_logs_task
  ON public.project_management_time_logs(task_id, work_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_time_logs_project
  ON public.project_management_time_logs(project_id, work_date DESC)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pm_time_logs_user_date
  ON public.project_management_time_logs(user_id, work_date DESC)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.project_management_task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.project_management_tasks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  actor_user_id uuid,
  actor_employee_id uuid REFERENCES public.employees(id),
  note text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pm_task_history_task
  ON public.project_management_task_history(task_id, created_at DESC);

INSERT INTO public.permissions (permission_key, name)
VALUES
  ('project_management.view', 'Gorev ve Proje Yonetimi goruntuleme'),
  ('project_management.create_task', 'Gorev olusturma'),
  ('project_management.edit_task', 'Gorev duzenleme'),
  ('project_management.delete_task', 'Gorev silme/pasiflestirme'),
  ('project_management.assign_task', 'Gorev atama'),
  ('project_management.manage_projects', 'Proje yonetimi'),
  ('project_management.manage_boards', 'Board yonetimi'),
  ('project_management.manage_workflows', 'Workflow yonetimi'),
  ('project_management.view_reports', 'Gorev ve proje raporlari goruntuleme'),
  ('project_management.manage_all', 'Gorev ve Proje Yonetimi tam yetki')
ON CONFLICT (permission_key) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.module_licenses (module_key, module_name, is_active, environment)
VALUES ('project_management', 'Gorev ve Proje Yonetimi', true, 'all')
ON CONFLICT (module_key) DO UPDATE
SET module_name = EXCLUDED.module_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();

INSERT INTO public.submodule_licenses (module_key, submodule_key, submodule_name, is_active, environment)
VALUES
  ('project_management', 'gorevler', 'Gorevler', true, 'all'),
  ('project_management', 'projeler', 'Projeler', true, 'all'),
  ('project_management', 'kanban-board', 'Kanban Board', true, 'all'),
  ('project_management', 'backlog', 'Backlog', true, 'all'),
  ('project_management', 'sprintler', 'Sprintler', true, 'all'),
  ('project_management', 'takvim', 'Takvim', true, 'all'),
  ('project_management', 'zaman-takibi', 'Zaman Takibi', true, 'all'),
  ('project_management', 'is-akislari', 'Is Akislari', true, 'all'),
  ('project_management', 'raporlar', 'Raporlar', true, 'all')
ON CONFLICT (module_key, submodule_key) DO UPDATE
SET submodule_name = EXCLUDED.submodule_name,
    is_active = EXCLUDED.is_active,
    environment = EXCLUDED.environment,
    updated_at = now();
