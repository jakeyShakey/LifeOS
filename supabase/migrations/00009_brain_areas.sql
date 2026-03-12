CREATE TABLE brain_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text,
  color text,
  icon text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE document_areas (
  document_id uuid REFERENCES documents ON DELETE CASCADE NOT NULL,
  area_id uuid REFERENCES brain_areas ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  PRIMARY KEY (document_id, area_id)
);

ALTER TABLE documents ADD COLUMN description text;
ALTER TABLE documents ADD COLUMN chunk_count integer DEFAULT 0;

ALTER TABLE brain_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own areas" ON brain_areas FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE document_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own document_areas" ON document_areas FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX brain_areas_user_id ON brain_areas (user_id);
CREATE INDEX document_areas_area_id ON document_areas (area_id);

DROP FUNCTION IF EXISTS match_chunks(vector, uuid, integer) CASCADE;
CREATE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 5,
  filter_area_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (id uuid, document_id uuid, document_title text, chunk_index integer, content text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT dc.id, dc.document_id, d.title AS document_title, dc.chunk_index, dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.user_id = match_user_id
    AND dc.embedding IS NOT NULL
    AND (filter_area_ids IS NULL OR dc.document_id IN (
      SELECT da.document_id FROM document_areas da WHERE da.area_id = ANY(filter_area_ids)
    ))
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
