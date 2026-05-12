drop trigger if exists trg_media_assets_audit on public.media_assets;

drop table if exists public.media_assets cascade;

drop function if exists public.document_media_registry_audit() cascade;

delete from public.permissions
where permission_key like 'media.%';
