update public.sirketler
set hero_documents = (
  select coalesce(jsonb_agg(
    case
      when coalesce(doc->>'thumbnailUrl', '') like 'data:image/jpeg%'
        or coalesce(doc->>'thumbnailUrl', '') like 'data:image/png%'
        or length(coalesce(doc->>'thumbnailUrl', '')) > 20000
        then doc - 'thumbnailUrl'
      else doc
    end
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(hero_documents, '[]'::jsonb)) as doc
)
where hero_documents is not null
  and exists (
    select 1
    from jsonb_array_elements(coalesce(hero_documents, '[]'::jsonb)) as doc
    where coalesce(doc->>'thumbnailUrl', '') like 'data:image/jpeg%'
       or coalesce(doc->>'thumbnailUrl', '') like 'data:image/png%'
       or length(coalesce(doc->>'thumbnailUrl', '')) > 20000
  );
