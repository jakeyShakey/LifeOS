-- Drop old match_chunks function (return type changed to include document_title)
DROP FUNCTION IF EXISTS match_chunks(vector, uuid, integer);

CREATE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  document_title text,
  chunk_index integer,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    d.title AS document_title,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.user_id = match_user_id
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
