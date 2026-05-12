update public.document_files df
set thumbnail_url = doc_item->>'thumbnailUrl'
from public.sirketler s
cross join lateral jsonb_array_elements(coalesce(s.hero_documents, '[]'::jsonb)) doc_item
where doc_item->>'documentId' = df.document_id::text
  and coalesce(df.thumbnail_url, '') = ''
  and coalesce(doc_item->>'thumbnailUrl', '') <> '';
