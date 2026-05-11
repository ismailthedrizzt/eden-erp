alter table public.document_files
  add column if not exists thumbnail_url text;
