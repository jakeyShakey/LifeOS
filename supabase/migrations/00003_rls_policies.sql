-- Enable RLS on all tables
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- calendar_connections policies
CREATE POLICY "users can select own calendar_connections"
  ON calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own calendar_connections"
  ON calendar_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own calendar_connections"
  ON calendar_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own calendar_connections"
  ON calendar_connections FOR DELETE
  USING (auth.uid() = user_id);

-- calendar_events policies
CREATE POLICY "users can select own calendar_events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own calendar_events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own calendar_events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own calendar_events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- folders policies
CREATE POLICY "users can select own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own folders"
  ON folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- notes policies
CREATE POLICY "users can select own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- documents policies
CREATE POLICY "users can select own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- document_chunks policies
CREATE POLICY "users can select own document_chunks"
  ON document_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own document_chunks"
  ON document_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own document_chunks"
  ON document_chunks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own document_chunks"
  ON document_chunks FOR DELETE
  USING (auth.uid() = user_id);

-- reminders policies
CREATE POLICY "users can select own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can delete own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);

-- match_chunks: cosine similarity search over document_chunks embeddings
-- Returns chunks for a given user ordered by similarity to a query embedding
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.user_id = match_user_id
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
$$;
