drop trigger if exists trg_documents_updated_at on public.documents;
drop trigger if exists trg_documents_audit on public.documents;
drop trigger if exists trg_document_files_current_version on public.document_files;
drop trigger if exists trg_document_files_audit on public.document_files;
drop trigger if exists trg_document_links_audit on public.document_links;

drop table if exists public.document_links cascade;
drop table if exists public.document_files cascade;
drop table if exists public.documents cascade;
drop table if exists public.sirket_dokumanlar cascade;

drop function if exists public.document_files_enforce_current_version() cascade;
drop function if exists public.document_registry_touch_updated_at() cascade;

delete from public.permissions
where permission_key like 'documents.%';
