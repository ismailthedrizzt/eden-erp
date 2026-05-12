create or replace function public.document_media_registry_audit()
returns trigger as $$
declare
  actor uuid;
  action_name text;
begin
  actor := coalesce(
    case when tg_op in ('INSERT', 'UPDATE') then nullif(to_jsonb(new)->>'created_by', '')::uuid else null end,
    case when tg_op in ('INSERT', 'UPDATE') then nullif(to_jsonb(new)->>'updated_by', '')::uuid else null end,
    case when tg_op in ('UPDATE', 'DELETE') then nullif(to_jsonb(old)->>'deleted_by', '')::uuid else null end
  );

  action_name := case
    when tg_table_name = 'documents' and tg_op = 'INSERT' then 'document_uploaded'
    when tg_table_name = 'document_files' and tg_op = 'INSERT' then 'document_version_changed'
    when tg_table_name = 'document_links' and tg_op = 'INSERT' then 'document_linked'
    when tg_table_name = 'document_links'
      and tg_op = 'UPDATE'
      and coalesce((to_jsonb(new)->>'is_deleted')::boolean, false)
      and not coalesce((to_jsonb(old)->>'is_deleted')::boolean, false)
      then 'document_unlinked'
    when tg_table_name = 'media_assets' and tg_op = 'INSERT' then 'media_uploaded'
    when tg_table_name = 'media_assets' and tg_op = 'UPDATE' then 'media_changed'
    else lower(tg_table_name || '_' || tg_op)
  end;

  insert into public.audit_logs (user_id, module_code, resource, record_id, action, before_json, after_json)
  values (
    actor,
    case when tg_table_name = 'media_assets' then 'media' else 'documents' end,
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, null),
    action_name,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql;
